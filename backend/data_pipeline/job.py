"""Durable catalog jobs. This module never calls the embedding provider."""
import argparse
import json
import logging
import os
import time
import uuid

from psycopg.types.json import Jsonb

from data_pipeline.facts import digest
from data_pipeline.materialize import rebuild
from dashboard.audience import PROFILES
from research.providers import load_settings
from data_pipeline.storage import PostgresStore

log = logging.getLogger('catalog.jobs')


def seed_profiles(store):
    fields = ['objective', 'sample_properties', 'test_parameters', 'measurement_types', 'coverage', 'limitations',
              'source_record_parameters']
    with store.connect() as conn:
        for audience, original in PROFILES.items():
            preferred_order = {
                'undergraduate': ['objective', 'sample_properties', 'measurement_types', 'test_parameters'],
                'graduate': ['objective', 'test_parameters', 'sample_properties', 'measurement_types'],
                'professor': ['objective', 'sample_properties', 'test_parameters', 'measurement_types'],
                'researcher': ['objective', 'test_parameters', 'measurement_types', 'sample_properties'],
                'engineer': ['objective', 'sample_properties', 'test_parameters', 'measurement_types'],
            }[audience]
            visible = fields if audience != 'undergraduate' else [f for f in fields if f != 'source_record_parameters']
            profile = dict(original, visible_fields=visible, field_order=preferred_order + [f for f in fields if f not in preferred_order],
                           max_display_values=5 if audience == 'undergraduate' else 25)
            conn.execute('''INSERT INTO audience_profiles(id,version,config) VALUES(%s,%s,%s)
                ON CONFLICT(id) DO NOTHING''', (audience, digest(profile), Jsonb(profile)))


def enqueue_all(store):
    with store.connect() as conn:
        ids = conn.execute('SELECT id FROM rag_investigations ORDER BY id').fetchall()
        for row in ids:
            conn.execute('SELECT catalog_enqueue(%s)', (row['id'],))
    return len(ids)


def claim(store):
    token = uuid.uuid4().hex
    with store.connect() as conn:
        conn.execute("""UPDATE background_jobs SET status='failed',error_code='LEASE_EXHAUSTED'
            WHERE status='running' AND lease_until<now() AND attempts>=3""")
        job = conn.execute("""WITH candidate AS (
            SELECT id FROM background_jobs WHERE attempts<3 AND
             ((status='pending' AND run_after<=now()) OR (status='running' AND lease_until<now()))
            ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1)
            UPDATE background_jobs j SET status='running',attempts=attempts+1,
             lease_until=now()+interval '10 minutes',lease_token=%s,updated_at=now()
            FROM candidate WHERE j.id=candidate.id RETURNING j.*""", (token,)).fetchone()
    return job


def run_once(store):
    job = claim(store)
    if not job:
        return False
    started = time.monotonic()
    try:
        if job['kind'] == 'catalog':
            status = rebuild(store, job)
        else:
            from data_pipeline.narrative import run_narrative
            status = run_narrative(store, job)
        with store.connect() as conn:
            conn.execute('''UPDATE background_jobs SET status=%s,lease_until=NULL,updated_at=now(),error_code=NULL
                WHERE id=%s AND lease_token=%s''', (status, job['id'], job['lease_token']))
        log.info('job=%s kind=%s status=%s elapsed=%.2f', job['id'], job['kind'], status, time.monotonic()-started)
    except Exception as error:
        log.warning('job=%s kind=%s error=%s attempt=%s', job['id'], job['kind'], type(error).__name__, job['attempts'])
        with store.connect() as conn:
            conn.execute('''UPDATE background_jobs SET status=%s,error_code=%s,
                run_after=now()+make_interval(secs=>%s),lease_until=NULL,updated_at=now()
                WHERE id=%s AND lease_token=%s''',
                         ('failed' if job['attempts'] >= 3 else 'pending', type(error).__name__,
                          min(300, 5 * 2**job['attempts']), job['id'], job['lease_token']))
    return True


def main():
    parser = argparse.ArgumentParser(description='Build catalog facts from stored data without embedding.')
    parser.add_argument('command', choices=['backfill', 'worker'])
    parser.add_argument('--once', action='store_true', help='Drain immediately runnable jobs and exit.')
    args = parser.parse_args()
    load_settings()
    logging.basicConfig(level=logging.INFO, format='%(levelname)s %(name)s %(message)s')
    store = PostgresStore(os.environ['DATABASE_URL'])
    seed_profiles(store)
    if args.command == 'backfill':
        print(json.dumps({'investigations_queued': enqueue_all(store)}))
        return
    while True:
        if run_once(store):
            continue
        if args.once:
            return
        time.sleep(2)


if __name__ == '__main__':
    main()
