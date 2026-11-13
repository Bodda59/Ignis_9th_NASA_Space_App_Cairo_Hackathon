import json
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from research.groq_budget import BudgetedChatGroq
from research.models import Evidence
from research.service import RAGService


class AnswerBudgetRegressionTest(unittest.TestCase):
    def test_prompt_trims_complete_records_and_retries_with_the_same_evidence(self):
        llm = Mock(spec=BudgetedChatGroq)
        def payload(messages):
            return json.loads(messages[1][1])
        llm.fits_messages.side_effect = lambda messages: len(payload(messages)['evidence']) == 1
        llm.invoke.side_effect = [
            SimpleNamespace(content='invalid json'),
            SimpleNamespace(content=json.dumps({
                'status': 'answered', 'findings': [{'text': 'Reported material was PMMA.', 'citation_ids': ['a']}],
                'interpretations': [], 'limitations': [],
            })),
        ]
        evidence = [Evidence(id=id, investigation_id='PSI-25', investigation_name='BASS-II',
                             document_id='doc', title='Table', text='PMMA', location={'csv_record': n},
                             content_hash='hash') for n, id in enumerate(('a', 'b'), 1)]
        scenario = {'conditions': [], 'records': [{'passage_id': id} for id in ('a', 'b')]}
        answer = RAGService(None, llm_factory=lambda: llm)._answer('Which material?', evidence, scenario)
        self.assertEqual([c['id'] for c in answer['citations']], ['a'])
        prompts = [payload(call.args[0]) for call in llm.invoke.call_args_list]
        self.assertEqual(prompts[0], prompts[1])
        self.assertEqual(prompts[0]['scenario']['records'], [{'passage_id': 'a'}])
