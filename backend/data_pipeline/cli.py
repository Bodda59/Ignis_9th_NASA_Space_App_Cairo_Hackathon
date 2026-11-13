"""Ingestion, database maintenance, and server commands."""
import argparse
import json
from pathlib import Path

from dashboard.audience import PROFILES
from data_pipeline.ingest import ingest_document
from research.dependencies import get_service
from research.models import Query


def run(app):
    parser = argparse.ArgumentParser(description='PDF/TXT/CSV ingestion, hybrid retrieval, and cited model answers.')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('init-db', help='Create only this application\'s PostgreSQL tables and vector extension.')
    ingest = commands.add_parser('ingest', help='Index one file. Repeat for other files; a stable document ID replaces old chunks.')
    ingest.add_argument('path', type=Path)
    ingest.add_argument('--investigation-id', required=True)
    ingest.add_argument('--name', required=True)
    ingest.add_argument('--source-url')
    ingest.add_argument('--document-id')
    ingest.add_argument('--condition-profile', type=Path, help='Reviewed JSON column mapping for this document.')
    index = commands.add_parser('index-conditions', help='Index persisted CSV rows without recomputing embeddings.')
    index.add_argument('--investigation-id', action='append', default=[])
    index.add_argument('--document-id')
    index.add_argument('--condition-profile', type=Path)
    for command in ['rank', 'ask']:
        query = commands.add_parser(command)
        query.add_argument('question')
        query.add_argument('--investigation-id', action='append', default=[])
        query.add_argument('--limit', type=int, default=5)
        query.add_argument('--audience', choices=list(PROFILES), default='graduate')
        query.add_argument('--explanation-depth', choices=['introductory', 'technical'])
    serve = commands.add_parser('serve')
    serve.add_argument('--host', default='127.0.0.1')
    serve.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    try:
        if args.command == 'serve':
            import uvicorn
            uvicorn.run(app, host=args.host, port=args.port)
            return
        service = get_service()
        if args.command == 'init-db':
            service.store.initialize()
            result = service.store.health()
        elif args.command == 'ingest':
            profile = json.loads(args.condition_profile.read_text()) if args.condition_profile else None
            result = ingest_document(service.store, service.embeddings_factory, service.model_name,
                                     args.path, args.investigation_id, args.name, args.source_url,
                                     args.document_id, profile)
        elif args.command == 'index-conditions':
            from data_pipeline.scenario_storage import backfill
            profile = json.loads(args.condition_profile.read_text()) if args.condition_profile else None
            result = backfill(service.store, args.investigation_id, args.document_id, profile)
        else:
            query = Query(question=args.question, investigation_ids=args.investigation_id, limit=args.limit,
                          audience=args.audience, explanation_depth=args.explanation_depth)
            result = service.rank(query) if args.command == 'rank' else service.interpret(query)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as error:
        if isinstance(error, ValueError):
            parser.exit(1, 'Error: ' + str(error) + '\n')
        parser.exit(1, 'Error: operation failed. Check the input file, database settings, and provider access.\n')
