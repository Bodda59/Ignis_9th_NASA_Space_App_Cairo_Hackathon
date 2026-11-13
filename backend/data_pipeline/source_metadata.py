"""Transfer source investigation metadata without publishing internal review notes."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_transfers():
    records = json.loads((ROOT / 'data_pipeline/sources/investigations.json').read_text())
    ids = [r['id'] for r in records]
    if len(ids) != len(set(ids)):
        raise ValueError('Investigation IDs must be unique.')
    for record in records:
        if (not re.fullmatch(r'[0-9a-f]{64}', record.get('source_sha256', ''))
                or record.get('raw_metadata', {}).get('Study Identifier') != [record['id']]):
            raise ValueError('Source metadata requires provenance and original fields.')
    return records


def source_details(study):
    metadata = study.get('metadata') or {}
    source = metadata.get('source_metadata') or {}
    # Original raw metadata stays stored; normal API responses avoid duplicating it.
    return {'investigation_id': study['id'], 'catalog_name': study['name'],
            'source_metadata': {k: v for k, v in source.items() if k != 'raw_metadata'}}


def build_transfer_sql(records):
    def literal(value):
        return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::jsonb"

    statements = ['BEGIN;', 'SET LOCAL standard_conforming_strings = on;']
    for record in records:
        sid = "'" + record['id'].replace("'", "''") + "'"
        payload = literal({'source_metadata': record})
        statements.append(f"DO $transfer$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.rag_investigations WHERE id={sid}) "
                          "THEN RAISE EXCEPTION 'Catalog investigation missing; stop transfer'; END IF; "
                          f"IF EXISTS (SELECT 1 FROM public.rag_investigations WHERE id={sid} "
                          "AND metadata->'source_metadata' IS NOT NULL AND "
                          f"metadata->'source_metadata'->>'source_sha256' IS DISTINCT FROM '{record['source_sha256']}') "
                          "THEN RAISE EXCEPTION 'Source revision differs; review before transfer'; END IF; END $transfer$;")
        # Only source metadata is replaced. Curated catalog metadata survives.
        statements.append(f'UPDATE public.rag_investigations SET metadata=metadata || {payload} '
                          f'WHERE id={sid} AND metadata IS DISTINCT FROM metadata || {payload};')
    return '\n'.join(statements + ['COMMIT;', ''])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    records = load_transfers()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(build_transfer_sql(records), encoding='utf-8')
    print(f'Prepared source metadata for {len(records)} investigations; no database connection made.')


if __name__ == '__main__':
    main()
