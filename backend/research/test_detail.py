"""Regression checks for grouped source records versus individual tests."""
import copy
import unittest
from contextlib import nullcontext
from types import SimpleNamespace
from unittest.mock import Mock, patch

from dashboard.dashboard import study_details
from data_pipeline.facts import aggregate, build_facts
from data_pipeline.reviewed import REPORT_DETAILS
from dashboard.service import Catalog


CSV = 'bre-summary'


def parameter(key, raw, *, number=None, category=None, state='usable'):
    return {'field': {'key': key, 'label': key.replace('_', ' ').title(),
                      'kind': 'number' if category is None else 'category',
                      'unit': '%' if key == 'oxygen_percent' else 'mm'},
            'raw': raw, 'state': state, 'low': number, 'high': number, 'category': category}


def source_row(index, kind='source_record'):
    return {'id': str(index), 'external_id': f'CSV record {index}', 'record_kind': kind,
            'parameters': {
                'burner_diameter_mm': parameter('burner_diameter_mm', '25', number=25),
                'fuel_bottle': parameter('fuel_bottle', '100% C2H4', category='100% c2h4'),
                'oxygen_percent': parameter('oxygen_percent', '21; 26.5; 40', state='ambiguous'),
            },
            'source': {'document_id': CSV, 'csv_record': index, 'source_url': 'https://example.org/bre',
                       'content_hash': 'csv-hash'}}


class InvestigationDetailTest(unittest.TestCase):
    def details(self, rows, *, report_hash=None, hide_source_summary=False, notes=(), corrections=(), sid="PSI-20"):
        study = {'id': sid, 'name': 'BRE', 'description': '', 'objective': 'Reported objective',
                 'metadata': {}, 'field_sources': {'objective': [{'field': 'Objective',
                     'source_url': 'https://example.org/bre'}]}}
        facts = build_facts(study, rows, [], len(rows))
        # Audience projection may omit grouped summaries; detail must not hide the source data.
        if hide_source_summary:
            facts.pop('source_record_parameters')
        for section in ('test_parameters', 'sample_properties'):
            for fields in facts[section].values():
                for field in fields:
                    field['distinct_value_count'] = len(field['values'])
        docs = [{'id': CSV, 'title': 'BRE daily summary', 'file_name': 'bre.csv', 'source_type': 'Experimental table', 'indexed': True,
                 'content_hash': 'csv-hash', 'source_url': 'https://example.org/bre',
                 'catalog_profile': {'source_corrections': list(corrections)}}]
        if sid == 'PSI-21':
            docs[0]['id'] = REPORT_DETAILS[sid]['document_id']
            docs[0]['content_hash'] = report_hash or 'unreviewed-csv'
        elif report_hash is not None:
            docs.append({'id': REPORT_DETAILS[sid]['document_id'], 'title': 'BRE final report',
                         'file_name': 'BRE_final_report_20220201.pdf', 'source_type': 'Reports', 'indexed': True, 'content_hash': report_hash,
                         'source_url': 'https://example.org/report'})
        counts = [{'record_kind': kind, 'count': sum(r['record_kind'] == kind for r in rows)}
                  for kind in ('reported_test', 'source_record', 'planned_record')]
        conn = Mock()
        conn.execute.side_effect = [Mock(fetchall=lambda: docs), Mock(fetchall=lambda: counts),
                                    Mock(fetchone=lambda: {'count': len(rows)}), Mock(fetchall=lambda: notes)]
        catalog = SimpleNamespace(summary=lambda *_: {'facts': facts},
                                  store=SimpleNamespace(connect=lambda: nullcontext(conn)))
        with patch('dashboard.dashboard.catalog_data', return_value=(
                [study], {sid: [r for r in rows if r['record_kind'] != 'planned_record']})):
            return study_details(catalog, sid, 'undergraduate' if hide_source_summary else 'graduate')

    def test_grouped_rows_keep_qualified_values_and_provenance_without_becoming_tests(self):
        rows = [source_row(1), source_row(2)]
        original = copy.deepcopy(rows)
        note = dict(document_id=CSV, location={'csv_record': 1}, source_url='https://example.org/bre',
                    content_hash='csv-hash', text='Pressures are not identified in this daily summary.')
        result = self.details(rows, hide_source_summary=True, notes=[note])
        self.assertEqual(result['tests'], [])
        self.assertEqual(result['data_availability']['source_row_count'], 2)
        self.assertEqual(result['data_availability']['source_record_count'], 2)
        self.assertEqual(result['data_availability']['record_label'], 'Daily summaries')
        self.assertEqual(result['data_availability']['measurement_summary_status'], 'not_mapped')
        oxygen = next(c for c in result['summary_sections']['conditions'] if 'Oxygen' in c['text'])
        self.assertIn('21; 26.5; 40', oxygen['text'])
        self.assertIn('not treated as individual test values', oxygen['text'])
        self.assertTrue(oxygen['citation_ids'])
        self.assertTrue(result['summary_sections']['materials'])
        self.assertTrue(any(note['text'] == c['text'] for c in result['summary_sections']['limitations']))
        self.assertEqual(rows, original)

    def test_reviewed_report_details_require_the_indexed_source_revision(self):
        rows = [source_row(1)]
        result = self.details(rows, report_hash=REPORT_DETAILS['PSI-20']['content_hash'])
        self.assertEqual(len(result['findings']), 8)
        self.assertEqual(len(result['summary_sections']['measurements']), 5)
        self.assertIn('26.5%', result['findings'][0]['text'])
        self.assertTrue(any('Methane/nitrogen' in f['text'] for f in result['findings']))
        self.assertTrue(any('not carried out' in f['text'] for f in result['summary_sections']['study_context']))
        refs = {c['id']: c for c in result['citations']}
        self.assertEqual(refs[result['findings'][0]['citation_ids'][0]]['location'], 'Page 39')
        self.assertEqual(refs[result['findings'][0]['citation_ids'][0]]['file_name'], 'BRE_final_report_20220201.pdf')
        self.assertEqual(refs[CSV]['file_name'], 'bre.csv')
        for section in result['summary_sections'].values():
            for entry in section:
                self.assertTrue(all(id in refs for id in entry['citation_ids']))
        changed = self.details(rows, report_hash='different-source-revision')
        self.assertEqual(changed['findings'], [])
        self.assertEqual(changed['summary_sections']['measurements'], [])

    def test_correction_history_stays_out_of_the_public_page(self):
        corrections = [{'csv_record': 11, 'header': 'Month', 'value': 'Sept', 'test_day': '20261',
                        'source_refs': [{'document_id': REPORT_DETAILS['PSI-20']['document_id'], 'page': 24}]}]
        result = self.details([source_row(11)], report_hash=REPORT_DETAILS['PSI-20']['content_hash'],
                              corrections=corrections)
        self.assertNotIn('corrected_cell_count', result['data_availability'])
        self.assertFalse(any('Stored daily log correction' in e['text']
                             for e in result['summary_sections']['limitations']))
        self.assertEqual(result['data_availability']['source_row_count'], 1)

    def test_cld_log_scope_and_publication_citations_are_separate(self):
        result = self.details([source_row(1)], sid='PSI-21',
                              report_hash=REPORT_DETAILS['PSI-21']['content_hash'])
        self.assertEqual(result['tests'], [])
        self.assertEqual(result['data_availability']['record_label'], 'Daily summaries')
        self.assertEqual(len(result['findings']), 2)
        self.assertEqual(len(result['equipment_links']), 1)
        self.assertTrue(any('not the flow rates' in e['text'] for e in result['summary_sections']['conditions']))
        self.assertTrue(any('not ambient oxygen' in e['text'] for e in result['summary_sections']['conditions']))
        refs = {c['id']: c for c in result['citations']}
        paper = refs[result['findings'][0]['citation_ids'][0]]
        self.assertEqual(paper['file_name'], 'ACME CSSCI paper 20220402.pdf')
        self.assertEqual(paper['location'], 'Page 5')
        self.assertEqual(paper['source_type'], 'paper')
        self.assertIn('ntrs.nasa.gov', paper['url'])
        self.assertFalse(any('Unmapped' in e['text'] for e in result['summary_sections']['limitations']))
        changed = self.details([source_row(1)], sid='PSI-21', report_hash='changed-log')
        self.assertEqual(changed['summary_sections']['study_context'], [])

    def test_real_zero_remains_a_numeric_test_value(self):
        row = source_row(1, 'reported_test')
        row['parameters']['oxygen_percent'] = parameter('oxygen_percent', '0', number=0)
        result = self.details([row])
        self.assertEqual(len(result['tests']), 1)
        self.assertEqual(result['tests'][0]['oxygen_pct'], 0)
        self.assertEqual(result['data_availability']['numeric_test_count'], 1)
        self.assertEqual(result['data_availability']['source_record_count'], 0)

    def test_cfig_report_separates_configurations_and_source_uncertainty(self):
        result = self.details([source_row(1, 'reported_test')], sid='PSI-159',
                              report_hash=REPORT_DETAILS['PSI-159']['content_hash'],
                              notes=[dict(document_id=CSV, location={'csv_record': 1},
                                          source_url='https://example.org', content_hash='csv-hash',
                                          text='hit burner T limit')])
        self.assertEqual(result['data_availability']['conditions_view'], 'source_tables')
        self.assertEqual(len(result['findings']), 3)
        self.assertEqual(len(result['summary_sections']['measurements']), 2)
        self.assertEqual(len(result['equipment_links']), 1)
        conditions = ' '.join(e['text'] for e in result['summary_sections']['conditions'])
        self.assertIn('not ambient chamber oxygen', conditions)
        self.assertIn('Blank cool-flame entries', conditions)
        limits = ' '.join(e['text'] for e in result['summary_sections']['limitations'])
        self.assertIn('273.15 K', limits)
        self.assertNotIn('hit burner T limit', limits)
        changed = self.details([], sid='PSI-159', report_hash='changed-report')
        self.assertEqual(changed['findings'], [])
        self.assertIsNone(changed['data_availability']['conditions_view'])

    def test_flame_design_uses_reported_work_and_keeps_qualifications(self):
        result = self.details([source_row(1, 'reported_test')], sid='PSI-10',
                              report_hash=REPORT_DETAILS['PSI-10']['content_hash'])
        self.assertEqual(result['data_availability']['conditions_view'], 'source_tables')
        self.assertEqual(len(result['findings']), 4)
        self.assertEqual(len(result['summary_sections']['measurements']), 3)
        self.assertEqual(len(result['equipment_links']), 1)
        self.assertIn('atmospheric-pressure', result['findings'][0]['text'])
        self.assertIn('model result, not an ISS burn time', result['findings'][2]['text'])
        conditions = ' '.join(e['text'] for e in result['summary_sections']['conditions'])
        self.assertIn('not ambient chamber oxygen', conditions)
        self.assertIn('not zeros', result['data_availability']['record_description'])
        limits = ' '.join(e['text'] for e in result['summary_sections']['limitations'])
        self.assertIn('22042M1', limits)
        self.assertIn('327 rows therefore are not a verified total', limits)
        changed = self.details([], sid='PSI-10', report_hash='changed-report')
        self.assertEqual(changed['findings'], [])
        self.assertIsNone(changed['data_availability']['conditions_view'])

    def test_sflame_daily_log_never_becomes_individual_flame_conditions(self):
        result = self.details([source_row(1), source_row(2)], sid='PSI-23',
                              report_hash=REPORT_DETAILS['PSI-23']['content_hash'])
        self.assertEqual(result['tests'], [])
        self.assertEqual(result['data_availability']['record_label'], 'Daily summaries')
        self.assertIn('276 nominally sustained ignitions', result['data_availability']['record_description'])
        self.assertEqual(len(result['findings']), 4)
        self.assertEqual(len(result['equipment_links']), 1)
        self.assertEqual(len(result['summary_sections']['measurements']), 4)
        limits = ' '.join(e['text'] for e in result['summary_sections']['limitations'])
        self.assertIn('hardware cutoff, not the flame temperature', limits)
        self.assertIn('not conclusively established', limits)
        self.assertNotIn('corrected', limits)
        changed = self.details([], sid='PSI-23', report_hash='different-report')
        self.assertEqual(changed['findings'], [])

    def test_bass2_uses_full_source_rows_and_keeps_sensor_limits_visible(self):
        result = self.details([source_row(1, 'reported_test')], sid='PSI-25',
                              report_hash=REPORT_DETAILS['PSI-25']['content_hash'])
        self.assertEqual(result['data_availability']['conditions_view'], 'source_tables')
        self.assertIn('three documented Olson rod tests', result['data_availability']['record_description'])
        self.assertEqual(len(result['findings']), 6)
        self.assertEqual(len(result['summary_sections']['measurements']), 4)
        self.assertEqual(len(result['summary_sections']['limitations']), 8)
        limits = ' '.join(e['text'] for e in result['summary_sections']['limitations'])
        self.assertIn('P22b', limits)
        self.assertIn('239 ppm', limits)
        self.assertIn('T1 and T2', limits)
        self.assertIn('did not develop sustained', result['findings'][1]['text'])
        changed = self.details([], sid='PSI-25', report_hash='changed-report')
        self.assertEqual(changed['findings'], [])

    def test_bass_keeps_maintenance_separate_and_report_counts_qualified(self):
        result = self.details([source_row(1, 'reported_test'), source_row(66)], sid='PSI-26',
                              report_hash=REPORT_DETAILS['PSI-26']['content_hash'])
        availability = result['data_availability']
        self.assertEqual(availability['conditions_view'], 'source_tables')
        self.assertEqual(availability['source_row_count'], 2)
        self.assertEqual(availability['reported_test_count'], 1)
        self.assertEqual(availability['source_record_count'], 1)
        self.assertEqual(len(result['findings']), 5)
        self.assertEqual(len(result['summary_sections']['measurements']), 3)
        self.assertEqual(len(result['summary_sections']['limitations']), 7)
        self.assertIn('one soot-cleaning activity', availability['record_description'])
        limits = ' '.join(e['text'] for e in result['summary_sections']['limitations'])
        self.assertIn('115 burns', limits)
        self.assertIn('does not determine which field is correct', limits)
        changed = self.details([], sid='PSI-26', report_hash='changed-report')
        self.assertEqual(changed['findings'], [])

    def test_planned_profiles_never_become_individual_tests(self):
        result = self.details([source_row(1, 'planned_record')])
        self.assertEqual(result['tests'], [])
        self.assertEqual(result['data_availability']['planned_record_count'], 1)
        self.assertEqual(result['data_availability']['reported_test_count'], 0)

    def test_all_qualified_values_still_keep_the_field_definition(self):
        field = aggregate([source_row(1)])['unknown'][0]
        self.assertEqual(field['key'], 'oxygen_percent')
        self.assertEqual(field['definition']['unit'], '%')


class SourceTableTest(unittest.TestCase):
    def test_bass2_co_range_and_resolution_do_not_invent_numeric_measurements(self):
        from data_pipeline.materialize import measurement_value
        mapping = dict(key='final_co_ppm', kind='number', label='Final CO', unit='ppm',
                       minimum=0, maximum=1000, excluded_values=['0.2', '0.3'])
        for raw in ['-1', '-3', '0.2', '0.3', 'OR', 'over', '>500', '1001']:
            value = measurement_value({'CO': raw}, 'CO', mapping)
            self.assertNotEqual(value['state'], 'usable', raw)
            self.assertIsNone(value['low'], raw)
            self.assertEqual(value['raw'], raw)
        for raw, number in [('0', 0), ('239', 239), ('1000', 1000)]:
            value = measurement_value({'CO': raw}, 'CO', mapping)
            self.assertEqual((value['state'], value['low']), ('usable', number))
        missing = measurement_value({'CO': ''}, 'CO', mapping)
        self.assertEqual(missing['state'], 'missing')

    def test_derived_kelvin_requires_reported_celsius_but_preserves_real_zero(self):
        from data_pipeline.materialize import measurement_value
        mapping = dict(key='peak_burner_temperature_k', kind='number', label='Peak burner temperature',
                       unit='K', requires_column='C')
        for missing in ['', '-', None, '#VALUE!']:
            value = measurement_value({'K': '273.15', 'C': missing}, 'K', mapping)
            self.assertEqual(value['state'], 'ambiguous')
            self.assertEqual(value['raw'], '273.15')
            self.assertIsNone(value['low'])
        value = measurement_value({'K': '273.15', 'C': 0}, 'K', mapping)
        self.assertEqual(value['state'], 'usable')
        self.assertEqual(value['low'], 273.15)

    def setUp(self):
        self.columns = [{'key': 'oxygen', 'header': 'Oxygen Conc (percent)'},
                        {'key': 'month', 'header': 'Month'}, {'key': 'ignitions', 'header': 'Flames Ignited'}]

    def record(self, number):
        return {'row_number': number,
                'source': {'document_id': CSV, 'csv_record': number},
                'cells': {'oxygen': '34%' if number == 5 else '21%' if number == 8 else '25; 34; 40',
                          'month': 'Sept' if number == 11 else 'Oct' if number == 12 else 'Dec',
                          'ignitions': 0 if number == 8 else 10}}

    def test_bre_profile_reads_corrected_percentages_without_splitting_daily_lists(self):
        import json
        from pathlib import Path
        from data_pipeline.conditions import ColumnMapping, parse_value
        profile = json.loads((Path(__file__).resolve().parents[1] /
                              'data_pipeline/scenario_profiles/PSI-20.json').read_text())
        mapping = ColumnMapping.model_validate(profile['columns']['Oxygen Conc (percent)'])
        for raw, expected in [('34%', 34), ('21%', 21)]:
            result = parse_value(raw, mapping)
            self.assertEqual((result['state'], result['low'], result['high']), ('usable', expected, expected))
        self.assertEqual(parse_value('25; 34; 40', mapping)['state'], 'ambiguous')

    def test_cld_profile_keeps_controller_capacity_and_fuel_schedule_out_of_ambient_conditions(self):
        import json
        from pathlib import Path
        from data_pipeline.conditions import extract_records
        from data_pipeline.loaders import SourceUnit
        profile = json.loads((Path(__file__).resolve().parents[1] /
                              'data_pipeline/scenario_profiles/PSI-21.json').read_text())
        row = {'Test Type': 'Improved coflow tests', 'Test Day': '21041', 'Fuel MFC': '0.2',
               'N2 MFC': '0.2', 'Fuel Bottle': '30% C2H4', 'Fuel conc. Range': '0%-30%'}
        records, _ = extract_records([SourceUnit('', {'csv_record': 29}, row)], profile)
        self.assertEqual(records[0]['kind'], 'source_record')
        values = {v['field']['key']: v for v in records[0]['values']}
        self.assertEqual(values['fuel_mfc_capacity_slpm']['low'], 0.2)
        self.assertIn('not the flow rate', values['fuel_mfc_capacity_slpm']['note'])
        self.assertEqual(values['fuel_concentration_schedule']['category'], '0%-30%')
        self.assertIsNone(values['fuel_concentration_schedule']['low'])
        self.assertNotIn('oxygen_percent', values)
        self.assertNotIn('airflow_cm_s', values)

    def test_bass_maintenance_is_preserved_without_becoming_a_fuel_or_test(self):
        import json
        from pathlib import Path
        from data_pipeline.conditions import extract_records
        from data_pipeline.loaders import SourceUnit
        profile = json.loads((Path(__file__).resolve().parents[1] /
                              'data_pipeline/scenario_profiles/PSI-26.json').read_text())
        rows = [{'As Run Test #': '', 'Fuel Sample Material': 'SOOT Cleaning'},
                {'As Run Test #': '24', 'Fuel Sample Material': '2 cm PMMA sphere'},
                {'As Run Test #': '', 'Fuel Sample Material': 'Nomex III'}]
        records, _ = extract_records([SourceUnit('', {'csv_record': i}, row)
                                      for i, row in enumerate(rows, 1)], profile)
        self.assertEqual([r['kind'] for r in records],
                         ['source_record', 'reported_test', 'reported_test'])
        self.assertEqual(records[0]['values'][0]['state'], 'ambiguous')
        self.assertIsNone(records[0]['values'][0]['category'])
        self.assertEqual(records[1]['values'][0]['category'], 'pmma')
        self.assertEqual(records[0]['values'][0]['raw'], 'SOOT Cleaning')

    def test_cursor_pagination_returns_all_eighteen_stored_rows_once(self):
        records = [self.record(n) for n in range(1, 19)]
        original = copy.deepcopy(records)

        def execute(sql, params=None):
            if 'FROM experiment_table_rows' in sql:
                offset, limit = params[1:]
                return Mock(fetchall=lambda: copy.deepcopy(records[offset:offset + limit]))
            return Mock()

        conn = Mock(execute=execute)
        catalog = Catalog(SimpleNamespace(connect=lambda: nullcontext(conn)), 'test-secret')
        catalog.table = Mock(return_value=({'id': 'table', 'document_id': CSV,
                                          'row_count': 18, 'revision': 'stable'}, self.columns))
        first = catalog.rows('PSI-20', 'table', 'graduate', 10, None, None)
        second = catalog.rows('PSI-20', 'table', 'graduate', 10, first['next_cursor'], None)
        self.assertEqual([r['row_number'] for r in first['items']], list(range(1, 11)))
        self.assertEqual([r['row_number'] for r in second['items']], list(range(11, 19)))
        self.assertIsNone(second['next_cursor'])
        self.assertEqual(second['total_rows'], 18)
        self.assertEqual(second['items'][0]['cells']['month'], 'Sept')
        self.assertEqual(second['items'][1]['cells']['month'], 'Oct')
        self.assertEqual(first['items'][4]['cells']['oxygen'], '34%')
        self.assertEqual(first['items'][7]['cells']['oxygen'], '21%')
        self.assertEqual(first['items'][7]['cells']['ignitions'], 0)
        self.assertEqual(records, original)

    def test_exports_match_stored_values_and_preserve_numeric_zero(self):
        import csv
        import io
        import json

        row = self.record(8)
        cursor = Mock()
        cursor.__iter__ = Mock(side_effect=lambda: iter([copy.deepcopy(row)]))
        conn = Mock()
        conn.execute.return_value.fetchone.return_value = {'revision': 'stable'}
        conn.cursor.return_value = nullcontext(cursor)
        catalog = Catalog(SimpleNamespace(connect=lambda: nullcontext(conn)), 'test-secret')
        catalog.table = Mock(return_value=({'id': 'table', 'document_id': CSV,
                                          'row_count': 1, 'revision': 'stable'}, self.columns))
        exported = list(csv.reader(io.StringIO(''.join(catalog.export('PSI-20', 'table', None, 'csv')))))
        self.assertEqual(exported[1], ['21%', 'Dec', '0'])
        exported = json.loads(''.join(catalog.export('PSI-20', 'table', None, 'json')))
        self.assertEqual(exported['rows'][0]['cells']['oxygen'], '21%')
        self.assertEqual(exported['rows'][0]['cells']['ignitions'], 0)


if __name__ == '__main__':
    unittest.main()
