import unittest

from dashboard.earth import TAGS, THEMES, citation, earth_catalogue, records, study_earth


class EarthApplicationsTest(unittest.TestCase):
    def test_every_theme_quote_is_copied_from_the_source_text(self):
        for sid, tags in TAGS.items():
            text = records()[sid]['research_impacts']
            for theme, quote in tags:
                self.assertIn(theme, THEMES)
                self.assertIn(quote, text, f'{sid} {theme}')

    def test_every_catalogued_study_has_impact_text_and_a_theme(self):
        for sid in records():
            earth = study_earth(sid)
            self.assertTrue(earth['text'])
            self.assertTrue(earth['themes'], sid)

    def test_unknown_study_has_no_earth_section(self):
        self.assertIsNone(study_earth('PSI-0'))
        self.assertEqual(citation('PSI-0'), {'doi': None, 'doi_url': None, 'psi_url': None})

    def test_citation_links_the_doi(self):
        self.assertEqual(citation('PSI-25')['doi_url'], 'https://doi.org/10.60555/4qc4-de67')

    def test_fire_safety_themes_come_before_cleaner_combustion(self):
        catalogue = earth_catalogue()
        flags = [theme['fire_safety'] for theme in catalogue['themes']]
        self.assertEqual(flags, sorted(flags, reverse=True))
        self.assertEqual(catalogue['study_count'], len(records()))
        self.assertTrue(all(theme['studies'] for theme in catalogue['themes']))
