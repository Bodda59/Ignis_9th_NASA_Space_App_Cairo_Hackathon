import unittest

from dashboard.gravity import (
    BOUNDING, BRACKETS, EARTH_COMPARISON_IDS, SIMULATED, gravity_catalogue, squash,
)
from dashboard.earth import records
from research.crew import study_gravities


class PartialGravityTest(unittest.TestCase):
    def test_every_quote_is_copied_from_the_named_field(self):
        for item in BRACKETS:
            text = records()[item['id']][item['field']]
            self.assertIn(squash(item['quote']), squash(text), item['id'])
        for item in SIMULATED['record_quotes']:
            self.assertIn(squash(item['quote']), squash(records()[SIMULATED['id']][item['field']]))
        self.assertIn(BOUNDING['caveat_quote'], records()[BOUNDING['caveat_study']]['hypothesis'])

    def test_explore_filter_matches_the_comparison_studies(self):
        for sid in records():
            tagged = 'normal_gravity' in study_gravities({'id': sid, 'metadata': {}})
            self.assertEqual(tagged, sid in EARTH_COMPARISON_IDS, sid)

    def test_catalogue_states_the_gap_and_links_every_finding(self):
        catalogue = gravity_catalogue()
        self.assertEqual(catalogue['counts']['partial_gravity_studies'], 0)
        flight_studies = [record for record in records().values()
                          if record['project_type'] == 'Microgravity Investigation']
        self.assertLess(len(flight_studies), len(records()))  # PSI-62 is a ground investigation.
        self.assertEqual(catalogue['counts']['microgravity_studies'], len(flight_studies))
        findings = [item for item in catalogue['brackets'] if item['finding']]
        self.assertEqual({item['id'] for item in findings}, {'PSI-98', 'PSI-101'})
        self.assertTrue(all(item['source']['url'].startswith('https://ntrs.nasa.gov/') for item in catalogue['outside']))
