"""Import source metadata and explicit measurement headers; never read or write embeddings."""
import argparse
import csv
import json
import os
from pathlib import Path

from psycopg.types.json import Jsonb

from data_pipeline.facts import digest
from research.providers import load_settings
from data_pipeline.storage import PostgresStore

# These quantity definitions come directly from the CSV headers. Ambiguous units are left unmapped.
MEASUREMENTS = {
    'Weight loss rate (mg/min)': ('mass_loss_rate_mg_min', 'Mass loss rate', 'mass_loss_rate', 'mg/min'),
    'Visible flame extinction diameter; mm': ('extinction_diameter_mm', 'Visible flame extinction diameter', 'length', 'mm'),
    'Burn time; s': ('burn_time_s', 'Burn duration', 'duration', 's'),
    'Burn Time (s)': ('burn_time_s', 'Burn duration', 'duration', 's'),
    'burn time (sec)': ('burn_time_s', 'Burn duration', 'duration', 's'),
    'Peak burner Temp (C)': ('peak_burner_temperature_c', 'Peak burner temperature', 'temperature', 'degC'),
    'Peak burner T (C )': ('peak_burner_temperature_c', 'Peak burner temperature', 'temperature', 'degC'),
    'Peak burner temp (K)': ('peak_burner_temperature_k', 'Peak burner temperature', 'temperature', 'K'),
    'Calibrated final O2 % by vol': ('final_oxygen_percent', 'Final oxygen concentration', 'oxygen_fraction', '%'),
    'Initial CO2 % by vol': ('initial_co2_percent', 'Initial carbon dioxide concentration', 'co2_fraction', '%'),
    'Final CO2 % by vol': ('final_co2_percent', 'Final carbon dioxide concentration', 'co2_fraction', '%'),
    'Initial CO (ppm)': ('initial_co_ppm', 'Initial carbon monoxide concentration', 'co_fraction', 'ppm'),
    'Final CO (ppm)': ('final_co_ppm', 'Final carbon monoxide concentration', 'co_fraction', 'ppm'),
}


CATEGORIES = {
    'material_flammability': {'PSI-25', 'PSI-26', 'PSI-20'},
    'spacecraft_fire_spread': {'PSI-98', 'PSI-99', 'PSI-100'},
    'smoke_and_fire_detection': {'PSI-47', 'PSI-101', 'PSI-102', 'PSI-107'},
    'fire_suppression_and_extinction': {'PSI-69', 'PSI-23'},
    'flame_behavior': {'PSI-10', 'PSI-21', 'PSI-22', 'PSI-39', 'PSI-68', 'PSI-106', 'PSI-107', 'PSI-159'},
    'gravity_effects': {'PSI-22', 'PSI-25', 'PSI-99', 'PSI-107'},
}


def import_metadata(store, root):
    count = 0
    with store.connect() as conn:
        studies = conn.execute('SELECT id,metadata,objective,description,field_sources FROM rag_investigations ORDER BY id').fetchall()
        for study in studies:
            source = next((p for p in (root / study['id']).glob('*/i_Investigation.txt')
                           if p.parent.name.strip().casefold() == 'metadata'), None)
            if source is None:
                continue
            with source.open(encoding='utf-8-sig', newline='') as handle:
                fields = {row[0]: row[1:] for row in csv.reader(handle, delimiter='\t') if row}
            identifiers = fields.get('Study Identifier', [])
            if identifiers != [study['id']]:
                raise ValueError(f"Metadata identity mismatch for {study['id']}")
            def value(key):
                return '\n'.join(v for v in fields.get(key, []) if v.strip())
            objective = study['objective'] or value('Comment[Objective]')
            description = study['description'] or value('Study Description') or value('Investigation Description')
            metadata = dict(study['metadata'])
            metadata.setdefault('hardware', value('Comment[Experiment Hardware]'))
            metadata.setdefault('acronym', value('Comment[Investigation Acronym]'))
            metadata.setdefault('categories', sorted(key for key, ids in CATEGORIES.items() if study['id'] in ids))
            sources = dict(study['field_sources'])
            for key, text in [('objective', objective), ('description', description)]:
                if text and key not in sources:
                    sources[key] = [{'source_url': f"https://psi.nasa.gov/physci/repo/data/investigations/{study['id']}",
                                     'file_name': 'i_Investigation.txt', 'source_hash': digest(source.read_text()),
                                     'field': 'Comment[Objective]' if key == 'objective' else 'Study Description'}]
            conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (study['id'],))
            conn.execute('''UPDATE rag_investigations SET objective=%s,description=%s,metadata=%s,field_sources=%s
                WHERE id=%s AND (objective,description,metadata,field_sources) IS DISTINCT FROM (%s,%s,%s,%s)''',
                         (objective, description, Jsonb(metadata), Jsonb(sources), study['id'],
                          objective, description, Jsonb(metadata), Jsonb(sources)))
            count += 1
        docs = conn.execute('''SELECT DISTINCT d.id,d.investigation_id,d.catalog_profile,p.row_data
            FROM rag_documents d JOIN LATERAL
             (SELECT row_data FROM rag_passages WHERE document_id=d.id AND jsonb_typeof(row_data)='object' LIMIT 1) p ON true''').fetchall()
        for doc in docs:
            profile = dict(doc['catalog_profile'])
            columns = dict(profile.get('measurement_columns', {}))
            for header in doc['row_data']:
                if header.strip() in MEASUREMENTS and header not in columns:
                    key, label, quantity, unit = MEASUREMENTS[header.strip()]
                    columns[header] = dict(key=key, label=label, quantity=quantity, unit=unit, kind='number',
                                           source={'csv_header': header},
                                           note='Quantity and unit explicitly stated in the source CSV column header.')
            if columns:
                profile['measurement_columns'] = columns
                conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (doc['investigation_id'],))
                conn.execute('UPDATE rag_documents SET catalog_profile=%s WHERE id=%s AND catalog_profile IS DISTINCT FROM %s',
                             (Jsonb(profile), doc['id'], Jsonb(profile)))
    return count


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source_directory', type=Path)
    args = parser.parse_args()
    load_settings()
    print(json.dumps({'metadata_checked': import_metadata(PostgresStore(os.environ['DATABASE_URL']), args.source_directory)}))
