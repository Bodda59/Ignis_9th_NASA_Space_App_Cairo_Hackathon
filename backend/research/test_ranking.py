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


class SourceCollectionRankingTest(unittest.TestCase):
    def test_parallel_scoped_search_keeps_coverage_and_embeds_once(self):
        from threading import Barrier
        from unittest.mock import Mock
        from research.models import Query
        from research.service import RAGService

        barrier = Barrier(2)
        embedder = Mock()
        embedder.embed_query.return_value = [0.1] * 384
        store = Mock()
        store.source_coverage.return_value = [
            {'id': 'PSI-25', 'name': 'BASS-II', 'source_type': label, 'documents': 1}
            for label in ('Reports', 'Engineering Documents')
        ]

        def search(vector, ids, model, label):
            self.assertEqual(ids, ['PSI-25'])
            barrier.wait(timeout=3)
            text = 'oxygen response' if label == 'Reports' else 'circuit enclosure'
            evidence = Evidence(id=label, investigation_id='PSI-25', investigation_name='BASS-II',
                                document_id=label, title=label, text=text, source_type=label,
                                location={'page': 1}, content_hash='hash')
            return [(evidence, .51)]

        store.search_collection.side_effect = search
        service = RAGService(store, embeddings_factory=lambda: embedder)
        result = service.rank(Query(question='oxygen response', investigation_ids=['PSI-25']))
        embedder.embed_query.assert_called_once_with('oxygen response')
        self.assertEqual(store.search_collection.call_count, 2)
        sources = {r['source_type']: r for r in result['investigations'][0]['source_relevance']}
        self.assertEqual(sources['Reports']['status'], 'matched')
        self.assertGreater(sources['Reports']['relevance_score'], 0)
        self.assertEqual(sources['Engineering Documents']['status'], 'no_match')
        self.assertEqual(sources['Science Documents']['status'], 'unavailable')

    def test_missing_requested_collection_does_not_fall_back(self):
        from unittest.mock import Mock
        from research.models import Query
        from research.service import RAGService

        store = Mock()
        store.source_coverage.return_value = [
            {'id': 'PSI-60', 'name': 'SPICE analysis', 'source_type': 'Investigation Metadata Files', 'documents': 1},
        ]
        factory = Mock()
        service = RAGService(store, embeddings_factory=factory)
        query = Query(question='What was the objective?', investigation_ids=['PSI-60'], source_types=['Reports'])
        ranked = service.rank(query)
        self.assertEqual(ranked['investigations'], [])
        self.assertEqual(ranked['source_coverage'][0]['source_relevance'][0]['status'], 'unavailable')
        self.assertEqual(service.interpret(query)['status'], 'no_data')
        factory.assert_not_called()
        store.search_collection.assert_not_called()
