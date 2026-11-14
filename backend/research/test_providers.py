import os
import unittest
from unittest.mock import Mock, patch

import httpx
from openai import BadRequestError, RateLimitError

from research.providers import get_llm


def provider_error(status, error_type):
    response = httpx.Response(status, request=httpx.Request('POST', 'https://generativelanguage.googleapis.com'))
    return error_type('Gemini request failed', response=response, body=None)


class GeminiFallbackTest(unittest.TestCase):
    def setUp(self):
        self.enterContext(patch.dict(os.environ, {
            'LLM_PROVIDER': 'gemini', 'GEMINI_MODEL': 'test-model',
            'GEMINI_API_KEY': 'primary', 'GEMINI_API_KEY_2': 'second',
            'GEMINI_API_KEY_3': 'third', 'GEMINI_API_KEY_4': 'fourth',
            'GEMINI_API_KEY_5': 'fifth',
        }, clear=True))
        self.enterContext(patch('research.providers.load_settings'))
        factory = self.enterContext(patch('langchain_openai.ChatOpenAI'))
        factory.side_effect = self.client
        self.calls = []
        self.failures = {}
        get_llm.cache_clear()
        self.addCleanup(get_llm.cache_clear)

    def client(self, *, api_key, **_):
        return Mock(invoke=lambda messages: self.respond(api_key, messages))

    def respond(self, key, messages):
        self.calls.append((key, messages))
        if key in self.failures:
            raise self.failures[key]
        return key

    def test_rate_limit_falls_through_five_keys_and_reuses_working_key(self):
        self.failures = {key: provider_error(429, RateLimitError)
                         for key in ('primary', 'second', 'third', 'fourth')}
        model = get_llm()
        self.assertEqual(model.invoke('question'), 'fifth')
        self.assertEqual(model.invoke('next question'), 'fifth')
        self.assertEqual(self.calls, [(key, 'question')
                                     for key in ('primary', 'second', 'third', 'fourth', 'fifth')]
                         + [('fifth', 'next question')])

    def test_exhaustion_retries_each_key_once_and_preserves_rate_limit(self):
        self.failures = {key: provider_error(429, RateLimitError)
                         for key in ('primary', 'second', 'third', 'fourth', 'fifth')}
        with self.assertRaises(RateLimitError) as caught:
            get_llm().invoke('question')
        self.assertIs(caught.exception, self.failures['fifth'])
        self.assertEqual(len(self.calls), 5)

    def test_bad_request_is_not_retried(self):
        self.failures = {'primary': provider_error(400, BadRequestError)}
        with self.assertRaises(BadRequestError):
            get_llm().invoke('question')
        self.assertEqual(self.calls, [('primary', 'question')])
