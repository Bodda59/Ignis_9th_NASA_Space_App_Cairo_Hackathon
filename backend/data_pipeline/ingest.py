"""Read, chunk, embed and persist one investigation source file."""
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

from data_pipeline.chunking import semantic_chunks
from data_pipeline.conditions import ConditionProfile, extract_records
from data_pipeline.loaders import load_file
from data_pipeline.source_types import SOURCE_TYPES, infer_source_type


def ingest_document(store, embeddings_factory, model_name, path, study_id, name,
                    source_url=None, document_id=None, condition_profile=None, source_type=None):
    if condition_profile is not None:
        condition_profile = ConditionProfile.model_validate(condition_profile).model_dump()
    path = Path(path)
    inferred = infer_source_type(path)
    if source_type is None and inferred != 'Other Sources':
        source_type = inferred
    if source_type is not None and source_type not in SOURCE_TYPES:
        raise ValueError("Unknown source type.")
    if not study_id.strip() or len(study_id) > 100 or not name.strip() or len(name) > 300:
        raise ValueError('Provide a study ID (1–100 characters) and name (1–300 characters).')
    if source_url and (urlparse(source_url).scheme not in {'http', 'https'} or not urlparse(source_url).netloc):
        raise ValueError('Source URL must be an HTTP(S) citation link; it is never fetched by the server.')
    if document_id and (not document_id.strip() or len(document_id) > 200):
        raise ValueError('Document ID must be 1–200 characters.')
    loaded = load_file(path)
    embeddings = embeddings_factory()
    chunks = semantic_chunks(loaded.units, embeddings)
    # Validate mappings before embedding documents; SQL persists both views atomically.
    extract_records(chunks, condition_profile)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    signature = hashlib.sha256(json.dumps({'hash': digest, 'model': model_name,
        'chunker': 'semantic-adjacent-v1', 'max_tokens': 384, 'percentile': 85,
        'source_url': source_url, 'title': path.stem}, sort_keys=True).encode()).hexdigest()
    id = document_id or hashlib.sha256(f'{study_id}:{path.name}'.encode()).hexdigest()[:32]
    vectors = embeddings.embed_documents([x.text for x in chunks])
    kwargs = {'condition_profile': condition_profile} if condition_profile is not None else {}
    result = store.save_document(study_id.strip(), name.strip(), id, path.stem, path.name,
                                       source_url, digest, signature, model_name, chunks, vectors, source_type=source_type, **kwargs)
    return dict(result, warnings=loaded.warnings)
