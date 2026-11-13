"""Configuration and application service construction."""
import os
from functools import lru_cache

from research.providers import load_settings
from research.service import RAGService
from data_pipeline.storage import PostgresStore


@lru_cache(maxsize=1)
def get_service():
    load_settings()
    threshold = float(os.getenv('MIN_SEMANTIC_SIMILARITY', '.5'))
    if not -1 <= threshold <= 1:
        raise ValueError('MIN_SEMANTIC_SIMILARITY must be between -1 and 1.')
    return RAGService(PostgresStore(os.getenv('DATABASE_URL', '')),
                      model_name=os.getenv('EMBEDDING_MODEL', 'BAAI/bge-small-en-v1.5'),
                      min_similarity=threshold)
