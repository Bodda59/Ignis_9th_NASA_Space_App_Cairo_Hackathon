import unittest
from unittest.mock import Mock

from fastapi.testclient import TestClient

from main import create_app
from rag.scenario import ConditionRequest, compare_condition
from research.service import RAGService


class ScenarioTest(unittest.TestCase):
    def test_overlap_is_distinct_from_match(self):
        requested = ConditionRequest(key='oxygen_percent', minimum=29, maximum=31, unit='%')
        reported = {'state': 'usable', 'low': 30, 'high': 35}
        self.assertEqual(compare_condition(requested, reported)['status'], 'overlap')

    def test_analogue_only_response_skips_generation(self):
        llm = Mock()
        service = RAGService(None, llm_factory=llm)
        service.scenario_rank = Mock(return_value={
            'investigations': [{'records': [{'category': 'related_analogue'}]}],
            'message': 'No indexed record matches all requested values or ranges.',
        })
        client = TestClient(create_app(service, api_key='test'))
        response = client.post('/scenario/interpret', headers={'X-API-Key': 'test'}, json={
            'question': 'What material was reported?',
            'conditions': [{'key': 'material', 'value': 'PMMA'}],
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'insufficient_evidence')
        llm.assert_not_called()
