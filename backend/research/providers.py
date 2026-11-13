import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


def load_settings():
    backend = Path(__file__).resolve().parents[1]
    load_dotenv(backend / '.env', override=False)
    load_dotenv(backend.parent / '.env', override=False)


class BGEEmbeddings:
    def __init__(self, model_name):
        os.environ.setdefault('HF_HOME', str(Path(__file__).resolve().parents[1] / '.cache/huggingface'))
        from sentence_transformers import SentenceTransformer
        self.model_name = model_name
        self.client = SentenceTransformer(model_name, device='cpu', trust_remote_code=False)
        if self.client.get_sentence_embedding_dimension() != 384:
            raise ValueError('This database requires 384-dimensional embeddings. Reconfigure and reindex before changing dimensions.')
        self.tokenizer = self.client.tokenizer

    def embed_documents(self, texts):
        return self.client.encode(texts, batch_size=32, normalize_embeddings=True,
                                  show_progress_bar=False).tolist()

    def embed_query(self, question):
        prompt = 'Represent this sentence for searching relevant passages: '
        if len(self.tokenizer.encode(prompt + question)) > 512:
            raise ValueError('Question exceeds the embedding model token limit; shorten it.')
        return self.embed_documents([prompt + question])[0]


@lru_cache(maxsize=1)
def get_embeddings():
    load_settings()
    return BGEEmbeddings(os.getenv('EMBEDDING_MODEL', 'BAAI/bge-small-en-v1.5'))


@lru_cache(maxsize=1)
def get_llm():
    load_settings()
    provider = os.getenv('LLM_PROVIDER', 'groq').strip().lower()
    if provider == 'openrouter':
        from langchain_openai import ChatOpenAI
        key = (os.getenv('OPENROUTER_API_KEY') or os.getenv('OPEN_ROUTER_KEY') or '').strip()
        model = (os.getenv('OPENROUTER_MODEL') or os.getenv('OPEN_ROUTER_LLM') or '').strip()
        if not key or not model:
            raise ValueError('Set OPENROUTER_API_KEY and OPENROUTER_MODEL (or OPEN_ROUTER_KEY and OPEN_ROUTER_LLM) in .env.')
        return ChatOpenAI(model=model, api_key=key, base_url='https://openrouter.ai/api/v1',
                          temperature=0, max_tokens=4096, timeout=90, max_retries=2,
                          use_responses_api=False)
    if provider == 'gemini':
        from langchain_openai import ChatOpenAI
        key = os.getenv('GEMINI_API_KEY', '').strip()
        model = os.getenv('GEMINI_MODEL', 'gemini-3.8-flash').strip()
        if not key or not model:
            raise ValueError('Set GEMINI_API_KEY and GEMINI_MODEL in .env.')
        return ChatOpenAI(model=model, api_key=key,
                          base_url='https://generativelanguage.googleapis.com/v1beta/openai/',
                          temperature=0, max_tokens=8192, timeout=90, max_retries=0,
                          reasoning_effort='low', use_responses_api=False)
    if provider == 'zai':
        from langchain_openai import ChatOpenAI
        key = (os.getenv('ZAI_API_KEY') or os.getenv('z_ai_key') or '').strip()
        model = os.getenv('ZAI_MODEL', 'glm-4.5-flash').strip()
        if not key or not model:
            raise ValueError('Set ZAI_API_KEY and ZAI_MODEL in .env.')
        return ChatOpenAI(model=model, api_key=key, base_url='https://api.z.ai/api/paas/v4',
                          temperature=0, max_tokens=4096, timeout=90, max_retries=0,
                          model_kwargs={'response_format': {'type': 'json_object'}},
                          extra_body={'thinking': {'type': 'disabled'}}, use_responses_api=False)
    if provider != 'groq':
        raise ValueError('LLM_PROVIDER must be groq, openrouter, gemini, or zai.')
    from research.groq_budget import BudgetedChatGroq
    key = os.getenv('GROQ_API_KEY', '').strip()
    model = os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b').strip()
    if not key or not model:
        raise ValueError('Set GROQ_API_KEY and GROQ_MODEL in .env.')
    reasoning = {'reasoning_effort': 'low'} if model in {'openai/gpt-oss-120b', 'openai/gpt-oss-20b'} else {}
    return BudgetedChatGroq(model=model, api_key=key, base_url='https://api.groq.com',
                            temperature=0, max_tokens=2048, timeout=90, max_retries=0, **reasoning)
