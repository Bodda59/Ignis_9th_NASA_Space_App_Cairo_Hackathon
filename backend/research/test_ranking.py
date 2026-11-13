import unittest

from research.models import Evidence


class RetrievalRelevanceRegressionTest(unittest.TestCase):
    def test_unrelated_query_rejects_weak_similarity_and_incidental_tokens(self):
        from research.retrieval import hybrid_search

        evidence = Evidence(id='a', investigation_id='PSI-39', investigation_name='Combustion experiment',
                            document_id='doc', title='Experiment notes', text='I used a cup in 1978 to measure the order of the samples.',
                            location={'page': 1}, content_hash='hash')
        self.assertEqual(hybrid_search('Who won the 1978 FIFA World Cup?', [evidence], [('a', .719)]), [])
        self.assertEqual(hybrid_search('xylophonezoopqz', [evidence], [('a', .649)]), [])
        self.assertEqual(hybrid_search('Where can I order a pizza?', [evidence], [('a', .553)]), [])

    def test_exact_identifier_and_high_confidence_paraphrase_still_rank(self):
        from research.retrieval import hybrid_search

        evidence = Evidence(id='a', investigation_id='PSI-25', investigation_name='BASS-II',
                            document_id='doc', title='Experiment notes', text='Smoke detector response in test B10.',
                            location={'page': 1}, content_hash='hash')
        self.assertEqual(hybrid_search('B1', [evidence], []), [])
        self.assertTrue(hybrid_search('B10', [evidence], [])[0]['exact_match'])
        self.assertEqual(hybrid_search('recognize airborne particles', [evidence], [('a', .82)])[0]['evidence'], evidence)
