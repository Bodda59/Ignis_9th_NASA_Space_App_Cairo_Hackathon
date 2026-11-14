import json
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from research.groq_budget import BudgetedChatGroq
from research.models import Evidence, Query
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


class StudyOverviewRegressionTest(unittest.TestCase):
    def setUp(self):
        self.store = Mock()
        self.objective = Evidence(
            id='PSI-25-published-objective', investigation_id='PSI-25',
            investigation_name='BASS-II', document_id='PSI-25-metadata',
            title='Published objective', text='Study how solid fuels burn in microgravity.',
            location={'section': 'Objective'}, content_hash='hash',
        )
        self.store.objective_evidence.return_value = [self.objective]
        self.llm = Mock()
        self.llm.invoke.return_value = SimpleNamespace(content=json.dumps({
            'status': 'answered', 'findings': [
                {'text': 'BASS-II studies solid fuels in microgravity.', 'citation_ids': [self.objective.id]},
            ], 'interpretations': [], 'limitations': [],
        }))
        self.service = RAGService(self.store, llm_factory=lambda: self.llm)
        self.service.retrieve = Mock(return_value=([], 'insufficient_evidence'))

    def test_scoped_overviews_use_published_objective_even_without_search_matches(self):
        for question in ('What is this study talking about?', 'What is the study about?',
                         'Can you summarize this investigation?', 'What did this experiment study?',
                         'Give me an overview of this study.', "What's the study about?"):
            with self.subTest(question=question):
                answer = self.service.interpret(Query(question=question, investigation_ids=['PSI-25']))
                self.assertEqual(answer['status'], 'answered')
                self.assertEqual([source['id'] for source in answer['citations']], [self.objective.id])
        self.service.retrieve.assert_not_called()

    def test_scoped_purpose_can_fall_back_to_metadata(self):
        query = Query(question='What was the purpose of BASS-II?', investigation_ids=['PSI-25'])
        self.assertEqual(self.service.interpret(query)['status'], 'answered')

    def test_overview_with_no_published_objective_uses_normal_retrieval(self):
        self.store.objective_evidence.return_value = []
        query = Query(question='What is this study about?', investigation_ids=['PSI-25'])
        self.assertEqual(self.service.interpret(query)['status'], 'insufficient_evidence')
        self.service.retrieve.assert_called_once_with(query)

    def test_ambiguous_overview_needs_one_selected_study(self):
        for scope in ([], ['PSI-25', 'PSI-69']):
            with self.subTest(scope=scope):
                answer = self.service.interpret(Query(question='What is this study about?', investigation_ids=scope))
                self.assertEqual(answer['status'], 'clarification_required')
                self.assertIn('Which study', answer['message'])
        self.service.retrieve.assert_not_called()
        self.llm.invoke.assert_not_called()

    def test_subject_specific_question_and_source_filter_preserve_retrieval(self):
        queries = [
            Query(question='What did this study find about airflow?', investigation_ids=['PSI-25']),
            Query(question='What is this study about?', investigation_ids=['PSI-25'], source_types=['Reports']),
            Query(question='What is BASS-II about?'),
        ]
        for query in queries:
            with self.subTest(question=query.question):
                self.assertEqual(self.service.interpret(query)['status'], 'insufficient_evidence')
                self.service.retrieve.assert_called_with(query)
        self.store.objective_evidence.assert_not_called()
