"""One token budget for the backend's Groq draft and evaluation calls."""
import asyncio
from collections import deque
from functools import lru_cache
import json
import math
import threading
import time

from groq import RateLimitError
from langchain_core.messages import convert_to_messages
from langchain_groq import ChatGroq
from pydantic import PrivateAttr
import tiktoken


TOKENS_PER_MINUTE = 8000


class GroqBudgetExceeded(RuntimeError):
    def __init__(self, retry_after=None):
        self.retry_after = retry_after
        super().__init__(
            'Groq is busy. Try again after the token budget resets.' if retry_after else
            'The request is too large for the Groq token budget. Narrow the question or investigation scope.'
        )


@lru_cache(maxsize=1)
def _encoding():
    return tiktoken.get_encoding('o200k_harmony')


class TokenBudget:
    # shortcut: one process owns the quota; use shared state before running multiple API workers.
    def __init__(self):
        self._lock = threading.Lock()
        self._reservations = deque()
        self._blocked_until = 0.0

    def reserve(self, tokens):
        """Reserve capacity now, or return seconds until it may be available."""
        if tokens > TOKENS_PER_MINUTE:
            raise GroqBudgetExceeded()
        with self._lock:
            now = time.monotonic()
            while self._reservations and self._reservations[0][0] <= now:
                self._reservations.popleft()
            delay = self._blocked_until - now
            if delay > 0:
                return delay
            total = sum(amount for _, amount in self._reservations)
            if total + tokens <= TOKENS_PER_MINUTE:
                self._reservations.append((now + 60, tokens))
                return 0
            for expires, amount in self._reservations:
                total -= amount
                if total + tokens <= TOKENS_PER_MINUTE:
                    return expires - now

    def defer(self, error):
        try:
            delay = float(error.response.headers.get('retry-after', ''))
        except ValueError:
            return False
        if not math.isfinite(delay) or not 0 <= delay <= 60:
            return False
        with self._lock:
            self._blocked_until = max(self._blocked_until, time.monotonic() + max(1, delay))
        return True


_shared_budget = TokenBudget()


class BudgetedChatGroq(ChatGroq):
    _budget: TokenBudget = PrivateAttr(default_factory=lambda: _shared_budget)

    def _estimate(self, messages, stop, kwargs):
        message_dicts, params = self._create_message_dicts(messages, stop)
        params.update(kwargs)
        prompt = json.dumps(message_dicts, ensure_ascii=False)
        # Count serialized messages plus headroom for Groq's model template.
        input_tokens = len(_encoding().encode_ordinary(prompt))
        output_tokens = params.get('max_completion_tokens') or params['max_tokens']
        return math.ceil(input_tokens * 1.05) + 128 + output_tokens

    def fits_messages(self, messages):
        return self._estimate(convert_to_messages(messages), None, {}) <= TOKENS_PER_MINUTE

    def _delays(self, tokens, deadline):
        while (delay := self._budget.reserve(tokens)) > 0:
            if time.monotonic() + delay > deadline:
                raise GroqBudgetExceeded(math.ceil(delay))
            yield delay

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        tokens = self._estimate(messages, stop, kwargs)
        deadline = time.monotonic() + 65
        for attempt in range(2):
            for delay in self._delays(tokens, deadline):
                time.sleep(delay)
            try:
                return super()._generate(messages, stop, run_manager, **kwargs)
            except RateLimitError as error:
                retry = self._budget.defer(error)
                if attempt or not retry:
                    raise

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        tokens = self._estimate(messages, stop, kwargs)
        deadline = time.monotonic() + 65
        for attempt in range(2):
            for delay in self._delays(tokens, deadline):
                await asyncio.sleep(delay)
            try:
                return await super()._agenerate(messages, stop, run_manager, **kwargs)
            except RateLimitError as error:
                retry = self._budget.defer(error)
                if attempt or not retry:
                    raise
