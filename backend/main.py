"""Compose the FastAPI application and its dependencies."""
import hmac
import os
import threading
import time
import uuid
from collections import deque
from functools import partial

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from research.dependencies import get_service
from research.errors import execute as execute_operation
from research.providers import load_settings
from research.routes import register_routes


def create_app(service=None, api_key=None):
    load_settings()
    app = FastAPI(title='NASA hybrid RAG', version='0.1.0')
    expected_key = api_key if api_key is not None else os.getenv('RAG_API_KEY', '')
    origins = [x.strip() for x in os.getenv('CORS_ORIGINS', '').split(',') if x.strip()]
    if origins:
        app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['POST', 'GET', 'PATCH', 'PUT'],
                           allow_headers=['Content-Type', 'X-API-Key', 'X-Audience-Type'])
    requests, lock = deque(), threading.Lock()

    def authorize(x_api_key: str | None = Header(default=None)):
        if not expected_key:
            raise HTTPException(503, 'Set RAG_API_KEY before using the API.')
        if x_api_key is None or not hmac.compare_digest(x_api_key, expected_key):
            raise HTTPException(401, 'Invalid API key.')
        with lock:
            now = time.monotonic()
            while requests and requests[0] < now - 60:
                requests.popleft()
            # shortcut: single-process team demo limiter; use a shared counter before multi-worker deployment.
            if len(requests) >= 30:
                raise HTTPException(429, 'Request limit reached. Retry in one minute.')
            requests.append(now)

    def engine():
        return service if service is not None else get_service()

    @app.middleware('http')
    async def protect(request: Request, call_next):
        length = request.headers.get('content-length', '')
        if length and (not length.isdigit() or int(length) > 16000):
            return JSONResponse(status_code=413, content={'error': {'code': 'BODY_TOO_LARGE', 'message': 'Request body is too large.'}})
        body, size = [], 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > 16000:
                return JSONResponse(status_code=413, content={'error': {'code': 'BODY_TOO_LARGE', 'message': 'Request body is too large.'}})
            body.append(chunk)
        request._body = b''.join(body)
        request.state.request_id = uuid.uuid4().hex
        response = await call_next(request)
        response.headers['X-Request-ID'] = request.state.request_id
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Cache-Control'] = 'no-store'
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request, error):
        return JSONResponse(status_code=error.status_code, headers=error.headers,
                            content={'error': {'code': 'HTTP_ERROR', 'message': error.detail}})

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        return JSONResponse(status_code=422, content={'error': {'code': 'INVALID_REQUEST', 'message': 'Invalid question, study selection, conditions, audience, explanation depth, or limit. Check the endpoint schema in /docs.'}})

    execute = partial(execute_operation, engine)
    register_routes(app, execute, authorize)
    return app


app = create_app()
