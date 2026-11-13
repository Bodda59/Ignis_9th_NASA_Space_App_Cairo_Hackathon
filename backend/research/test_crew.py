import unittest

from research.crew import Context, Range, habitat_relevance, record_matches, study_topics


def numeric(low, high=None):
    return {'state': 'usable', 'low': low, 'high': low if high is None else high}


class HabitatEvidenceTest(unittest.TestCase):
    def test_different_runs_do_not_create_a_combined_match(self):
        study = {'id': 'PSI-25', 'metadata': {}}
        rows = [
            {'external_id': 'A', 'record_kind': 'reported_test', 'parameters': {'oxygen_percent': numeric(30)}},
            {'external_id': 'B', 'record_kind': 'reported_test', 'parameters': {'pressure_kpa': numeric(56.5)}},
        ]
        score, reasons, gaps = habitat_relevance(
            study, rows, Context(habitat='lunar_base', oxygen_pct=30, pressure_kpa=56.5))
        self.assertEqual(score, 0)
        self.assertEqual(reasons, [])
        self.assertEqual({gap['kind'] for gap in gaps}, {'gravity', 'condition'})

    def test_measured_condition_keeps_gravity_gap_visible(self):
        study = {'id': 'PSI-25', 'metadata': {}}
        row = {'external_id': 'A', 'record_kind': 'reported_test', 'source': {'csv_record': 7},
               'parameters': {'oxygen_percent': numeric(30), 'pressure_kpa': numeric(56.5)}}
        score, reasons, gaps = habitat_relevance(study, [row],
            Context(habitat='lunar_base', oxygen_pct=30, pressure_kpa=56.5))
        self.assertEqual(score, 10)
        self.assertIn('Test A', reasons[0]['text'])
        self.assertEqual(reasons[0]['source'], {'csv_record': 7})
        self.assertEqual(gaps[0]['kind'], 'gravity')

    def test_burner_oxygen_is_excluded_from_ambient_filter(self):
        row = {'parameters': {'oxidizer_feed_oxygen_percent': numeric(85)}}
        self.assertFalse(record_matches(row, set(), {'oxygen_pct': Range(min=80)}))

    def test_airflow_converts_cm_per_second(self):
        row = {'parameters': {'airflow_cm_s': numeric(20)}}
        self.assertTrue(record_matches(row, set(), {'airflow_m_s': Range(min=.2, max=.2)}))

    def test_gas_flame_study_can_support_two_topics(self):
        self.assertEqual(study_topics({'id': 'PSI-10', 'metadata': {}}), ['detection', 'prevention'])
