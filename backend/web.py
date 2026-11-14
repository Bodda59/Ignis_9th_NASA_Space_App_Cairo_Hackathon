"""Production web front: serve the built React app and its API gateway from FastAPI.

In development the Vite server does this job (frontend/vite.config.ts). In the
deployed container there is no Vite, so this ASGI middleware:

- forwards `/research-gateway/<endpoint>` to the backend route `<endpoint>`,
  for the same allowlist as Vite, and adds the API key on the server side so it
  never reaches the browser;
- serves files from the built `frontend/dist`, with long caching for hashed assets;
- answers browser page loads (`/explore`, `/rank`, ...) with `index.html` so the
  React router can take over.

It only runs when FRONTEND_DIST is set, so local backend runs are unchanged.
"""
import re
from pathlib import Path

from starlette.responses import FileResponse, PlainTextResponse

PREFIX = '/research-gateway'
# Keep in step with the proxy allowlist in frontend/vite.config.ts.
ALLOWED = re.compile(
    r'^/(?:api/v1/(?:audiences|earth|gravity|research/(?:filters|relevance)|investigations(?:/[A-Za-z0-9_/-]+)?|rank|interpret)'
    r'|scenario/(?:fields|options|rank|interpret)|learning/materials)$')
# Backend paths a page load must never shadow.
BACKEND_ONLY = ('/api/', '/docs', '/redoc', '/openapi.json', '/health')


class WebGateway:
    def __init__(self, app, dist, api_key):
        self.app = app
        self.dist = Path(dist).resolve()
        self.index = self.dist / 'index.html'
        self.key = api_key.encode()
        if not self.index.is_file():
            raise RuntimeError(f'FRONTEND_DIST has no index.html: {self.dist}')

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        path = scope['path']
        if path == PREFIX or path.startswith(PREFIX + '/'):
            inner = path[len(PREFIX):]
            if not ALLOWED.match(inner):
                return await PlainTextResponse('Not found', status_code=404)(scope, receive, send)
            headers = [(name, value) for name, value in scope['headers'] if name != b'x-api-key']
            headers.append((b'x-api-key', self.key))
            scope = dict(scope, path=inner, raw_path=inner.encode(), headers=headers)
            return await self.app(scope, receive, send)
        if scope['method'] in ('GET', 'HEAD') and not path.startswith(BACKEND_ONLY):
            response = self.static(path) or (self.page() if self.wants_html(scope) else None)
            if response is not None:
                return await response(scope, receive, send)
        return await self.app(scope, receive, send)

    def static(self, path):
        relative = path.lstrip('/')
        if not relative:
            return self.page()
        try:
            file = (self.dist / relative).resolve()
        except (OSError, ValueError):
            return None
        if not file.is_relative_to(self.dist) or not file.is_file():
            return None
        if file == self.index:
            return self.page()
        cache = 'public, max-age=31536000, immutable' if relative.startswith('assets/') else 'public, max-age=86400'
        return FileResponse(file, headers={'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff'})

    def page(self):
        return FileResponse(self.index, headers={'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'})

    @staticmethod
    def wants_html(scope):
        accept = dict(scope['headers']).get(b'accept', b'')
        return b'text/html' in accept
