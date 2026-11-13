"""Versioned REST routes; legacy RAG methods are delegated unchanged."""
import hashlib
import hmac
import logging
import os
import time
import uuid
from typing import Literal

import psycopg
from fastapi import APIRouter, Depends, Header, HTTPException, Query as Param, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.routing import APIRoute
from psycopg.types.json import Jsonb

from dashboard.dashboard import register_dashboard
from dashboard.schemas import CompareRequest, DocumentProfile, MetadataUpdate
from dashboard.service import Catalog, CatalogError
from dashboard.audience import Audience
from research.models import Query

log = logging.getLogger('catalog.api')


def failure(status, code, message, request_id, details=None):
    return JSONResponse(status_code=status, content={'error': {
        'code': code, 'message': message, 'details': details, 'request_id': request_id}})


class CatalogRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handler(request):
            request.state.catalog_request_id = uuid.uuid4().hex
            request_id = request.state.catalog_request_id
            started = time.monotonic()
            try:
                response = await original(request)
            except CatalogError as error:
                response = failure(error.status, error.code, error.message, request_id, error.details)
            except RequestValidationError as error:
                details = [{'location': list(e['loc']), 'type': e['type']} for e in error.errors()]
                response = failure(422, 'INVALID_REQUEST', 'Request validation failed.', request_id, details)
            except HTTPException as error:
                response = failure(error.status_code, 'HTTP_ERROR', str(error.detail), request_id)
            except psycopg.Error:
                response = failure(503, 'DATABASE_UNAVAILABLE', 'The catalog database is unavailable.', request_id)
            except Exception as error:
                log.error('request=%s error=%s', request_id, type(error).__name__)
                response = failure(500, 'INTERNAL_ERROR', 'The request could not be completed.', request_id)
            response.headers['X-Request-ID'] = request_id
            log.info('request=%s method=%s route=%s status=%s elapsed=%.3f',
                     request_id, request.method, self.path, response.status_code, time.monotonic()-started)
            return response
        return handler


def create_router(engine, execute, legacy_key, limit_query_requests):
    router = APIRouter(prefix='/api/v1', tags=['Investigation catalog'], route_class=CatalogRoute, responses={
        401: {'description': 'API key required'}, 403: {'description': 'Insufficient scope'},
        404: {'description': 'Resource missing'}, 409: {'description': 'Revision changed'},
        422: {'description': 'Validation failed'}, 503: {'description': 'Dependency unavailable'}})

    def service():
        secret = legacy_key or os.getenv('CATALOG_CURSOR_SECRET') or os.getenv('RAG_API_KEY', '')
        if not secret:
            raise CatalogError(503, 'CONFIGURATION_ERROR', 'Configure the API authentication key.')
        return Catalog(engine().store, secret)

    def authorize(scope, key):
        if not key:
            raise CatalogError(401, 'UNAUTHORIZED', 'An API key is required.')
        configured = legacy_key or os.getenv('RAG_API_KEY', '')
        if configured and hmac.compare_digest(key, configured):
            if scope in {'read', 'query'}:
                return
            raise CatalogError(403, 'FORBIDDEN', 'This key lacks the required permission.')
        admin = os.getenv('CATALOG_ADMIN_API_KEY', '')
        if admin and hmac.compare_digest(key, admin):
            return
        with engine().store.connect() as conn:
            row = conn.execute('SELECT scopes FROM api_keys WHERE key_hash=%s AND revoked_at IS NULL',
                               (hashlib.sha256(key.encode()).hexdigest(),)).fetchone()
        if not row:
            raise CatalogError(401, 'UNAUTHORIZED', 'Invalid API key.')
        if scope not in row['scopes'] and 'admin' not in row['scopes']:
            raise CatalogError(403, 'FORBIDDEN', 'This key lacks the required permission.')

    def read(key: str | None = Header(default=None, alias='X-API-Key')):
        authorize('read', key)

    def query_access(key: str | None = Header(default=None, alias='X-API-Key')):
        authorize('query', key)
        limit_query_requests()

    def admin(key: str | None = Header(default=None, alias='X-API-Key')):
        authorize('admin', key)

    def audience(value: Audience = Header(alias='X-Audience-Type')):
        return value

    def respond(request, data, selected=None, status=200):
        return JSONResponse(status_code=status, content=jsonable_encoder({
            'data': data, 'meta': {'request_id': request.state.catalog_request_id, 'audience': selected}}))

    @router.get('/audiences', dependencies=[Depends(read)])
    def audiences(request: Request):
        with engine().store.connect() as conn:
            rows = conn.execute('SELECT id,version,config FROM audience_profiles ORDER BY id').fetchall()
        return respond(request, {'items': rows})

    @router.get('/investigations', dependencies=[Depends(read)])
    def investigations(request: Request, audience_type=Depends(audience), limit: int = Param(20, ge=1, le=100),
                       cursor: str | None = Param(None, max_length=4000),
                       sort: Literal['title', '-title', 'updated_at', '-updated_at'] = 'title',
                       category: str | None = Param(None, max_length=100),
                       fuel_type: str | None = Param(None, max_length=100),
                       gravity: str | None = Param(None, max_length=100)):
        return respond(request, service().list_studies(audience_type, limit, cursor, sort, category, fuel_type, gravity), audience_type)

    @router.get('/investigations/search', dependencies=[Depends(read)])
    def search(request: Request, q: str = Param(min_length=1, max_length=300), audience_type=Depends(audience),
               limit: int = Param(20, ge=1, le=100), cursor: str | None = Param(None, max_length=4000),
               category: str | None = Param(None, max_length=100),
               fuel_type: str | None = Param(None, max_length=100), gravity: str | None = Param(None, max_length=100)):
        if not q.strip():
            raise CatalogError(422, 'INVALID_QUERY', 'Enter a search query.')
        return respond(request, service().search(q, audience_type, limit, cursor, category, fuel_type, gravity), audience_type)

    @router.get('/investigations/autocomplete', dependencies=[Depends(read)])
    def autocomplete(request: Request, q: str = Param(min_length=1, max_length=100),
                     limit: int = Param(8, ge=1, le=20), audience_type=Depends(audience)):
        return respond(request, service().autocomplete(q, audience_type, limit), audience_type)

    @router.get('/investigations/{study}/metadata', dependencies=[Depends(read)])
    def source_metadata(study: str, request: Request, audience_type=Depends(audience)):
        return respond(request, service().metadata(study), audience_type)

    @router.get('/investigations/{study}/summary', dependencies=[Depends(read)])
    def summary(study: str, request: Request, audience_type=Depends(audience)):
        data = service().summary(study, audience_type)
        return respond(request, data, audience_type, 202 if data['status'] in {'pending', 'failed'} else 200)

    @router.post('/investigations/compare', dependencies=[Depends(read)])
    def compare(body: CompareRequest, request: Request, audience_type=Depends(audience)):
        data = service().compare(body.investigation_ids, audience_type)
        return respond(request, data, audience_type, 202 if data['status'] == 'pending' else 200)

    @router.post('/rank', dependencies=[Depends(query_access)])
    def rank(body: Query, request: Request, audience_type=Depends(audience)):
        return respond(request, execute('rank', body.model_copy(update={'audience': audience_type})), audience_type)

    @router.post('/interpret', dependencies=[Depends(query_access)])
    def interpret(body: Query, request: Request, audience_type=Depends(audience)):
        return respond(request, execute('interpret', body.model_copy(update={'audience': audience_type})), audience_type)

    @router.get('/investigations/{study}/tables', dependencies=[Depends(read)])
    def tables(study: str, request: Request, audience_type=Depends(audience)):
        return respond(request, service().tables(study), audience_type)

    @router.get('/investigations/{study}/tables/{table_id}/preview', dependencies=[Depends(read)])
    def preview(study: str, table_id: str, request: Request, audience_type=Depends(audience),
                limit: int = Param(5, ge=1, le=100), columns: list[str] | None = Param(None),
                selection: Literal['first', 'representative'] = 'first'):
        return respond(request, service().rows(study, table_id, audience_type, limit, None, columns, selection), audience_type)

    @router.get('/investigations/{study}/tables/{table_id}/rows', dependencies=[Depends(read)])
    def rows(study: str, table_id: str, request: Request, audience_type=Depends(audience),
             limit: int = Param(100, ge=1, le=1000), columns: list[str] | None = Param(None),
             cursor: str | None = Param(None, max_length=4000)):
        return respond(request, service().rows(study, table_id, audience_type, limit, cursor, columns), audience_type)

    @router.get('/investigations/{study}/tables/{table_id}/export', dependencies=[Depends(read)])
    def export(study: str, table_id: str, audience_type=Depends(audience),
               format: Literal['csv', 'json'] = 'csv', columns: list[str] | None = Param(None)):
        stream = service().export(study, table_id, columns, format)
        return StreamingResponse(stream, media_type='text/csv' if format == 'csv' else 'application/json',
                                 headers={'Content-Disposition': f'attachment; filename="experiment-table.{format}"'})

    @router.get('/jobs/{job_id}', dependencies=[Depends(read)])
    def job(job_id: int, request: Request, audience_type=Depends(audience)):
        with engine().store.connect() as conn:
            row = conn.execute('''SELECT id,kind,target,status,attempts,error_code,created_at,updated_at
                FROM background_jobs WHERE id=%s''', (job_id,)).fetchone()
        if not row:
            raise CatalogError(404, 'NOT_FOUND', 'Job not found.')
        return respond(request, row, audience_type)

    @router.post('/admin/investigations/{study}/refresh', dependencies=[Depends(admin)])
    def refresh(study: str, request: Request, audience_type=Depends(audience)):
        catalog = service()
        with catalog.store.connect() as conn:
            catalog.require_study(conn, study)
            job_id = conn.execute('SELECT catalog_enqueue(%s) AS id', (study,)).fetchone()['id']
            job = conn.execute('SELECT id,status FROM background_jobs WHERE id=%s', (job_id,)).fetchone()
        return respond(request, job, audience_type, 200 if job['status'] == 'complete' else 202)

    @router.patch('/admin/investigations/{study}/metadata', dependencies=[Depends(admin)])
    def metadata(study: str, body: MetadataUpdate, request: Request, audience_type=Depends(audience)):
        with engine().store.connect() as conn:
            conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (study,))
            current = service().require_study(conn, study)
            updates = {key: getattr(body, key) if key in body.model_fields_set else current[key]
                       for key in ['description', 'objective', 'metadata', 'field_sources']}
            updates['field_sources'] = {**current['field_sources'], **updates['field_sources']}
            for field in ['objective', 'description']:
                if field in body.model_fields_set and updates[field] and not updates['field_sources'].get(field):
                    raise CatalogError(422, 'MISSING_PROVENANCE', f'Provide source references for {field}.')
            conn.execute('''UPDATE rag_investigations SET description=%s,objective=%s,metadata=%s,field_sources=%s
                WHERE id=%s''', (updates['description'], updates['objective'], Jsonb(updates['metadata']), Jsonb(updates['field_sources']), study))
        return respond(request, {'status': 'queued', 'investigation_id': study}, audience_type, 202)

    @router.put('/admin/documents/{document_id}/profile', dependencies=[Depends(admin)])
    def document_profile(document_id: str, body: DocumentProfile, request: Request, audience_type=Depends(audience)):
        with engine().store.connect() as conn:
            doc = conn.execute('SELECT investigation_id FROM rag_documents WHERE id=%s', (document_id,)).fetchone()
            if not doc:
                raise CatalogError(404, 'NOT_FOUND', 'Document not found.')
            conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (doc['investigation_id'],))
            conn.execute('UPDATE rag_documents SET catalog_profile=%s WHERE id=%s', (Jsonb(body.model_dump()), document_id))
        return respond(request, {'status': 'queued', 'document_id': document_id}, audience_type, 202)

    register_dashboard(router, service, read, audience, respond)
    return router
