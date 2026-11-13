"""Enqueue optional narrative work within the caller's transaction."""
import os

from psycopg.types.json import Jsonb

from data_pipeline.facts import digest


def enqueue_narrative(conn, kind, target, source_hash, payload):
    if os.getenv('CATALOG_NARRATIVE_ENABLED', 'false').lower() != 'true':
        return
    key = digest([kind, target, source_hash, payload, os.getenv('CATALOG_NARRATIVE_VERSION', 'v1')])
    conn.execute('''INSERT INTO background_jobs(kind,target,source_hash,payload,deduplication_key)
        VALUES(%s,%s,%s,%s,%s) ON CONFLICT(deduplication_key) DO NOTHING''',
                 (kind, target, source_hash, Jsonb(payload), key))
