"""Configuration and application service construction."""
import logging
import os
import threading
import time
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
                      min_similarity=threshold,
                      max_attempts=int(os.getenv('RAG_MAX_ATTEMPTS', '3')))


def warm_up():
    """Load the embedding model, open the database pool and read the passages in the background."""
    def run():
        log, started = logging.getLogger('uvicorn.error'), time.perf_counter()
        try:
            from research.providers import get_embeddings
            service = get_service()
            get_embeddings().embed_query('warm up')
            count = service.store.warm(service.model_name)
            from research.crew import cached_catalog
            cached_catalog(service.store)
            log.info('Search is warm: %s passages in memory after %.1fs.', count, time.perf_counter() - started)
        except Exception as error:
            # The first question does this work instead. The message may hold the database URL, so log the type only.
            log.warning('Warm-up skipped (%s). The first question will be slower.', type(error).__name__)

    if os.getenv('RAG_WARMUP', '1') != '0':
        threading.Thread(target=run, name='warm-up', daemon=True).start()
