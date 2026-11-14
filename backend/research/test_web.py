import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

from main import create_app

HTML = {'Accept': 'text/html,application/xhtml+xml'}


class WebGatewayTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        dist = Path(self.tmp.name)
        (dist / 'assets').mkdir()
        (dist / 'index.html').write_text('<!doctype html><title>app</title>')
        (dist / 'assets' / 'app-1a2b.js').write_text('console.log(1)')
        (dist / 'favicon.svg').write_text('<svg/>')
        Path(self.tmp.name + '-secret.txt').write_text('secret')
        with patch.dict(os.environ, {'FRONTEND_DIST': str(dist)}):
            self.client = TestClient(create_app(service=Mock(), api_key='server-key'))

    def tearDown(self):
        self.tmp.cleanup()
        Path(self.tmp.name + '-secret.txt').unlink(missing_ok=True)

    def test_page_loads_get_the_app_shell(self):
        for path in ['/', '/explore', '/investigations/PSI-25', '/rank', '/gravity']:
            response = self.client.get(path, headers=HTML)
            self.assertEqual(response.status_code, 200, path)
            self.assertIn('<title>app</title>', response.text)
            self.assertEqual(response.headers['cache-control'], 'no-cache')

    def test_hashed_assets_are_cached_and_other_files_served(self):
        asset = self.client.get('/assets/app-1a2b.js')
        self.assertEqual(asset.status_code, 200)
        self.assertIn('immutable', asset.headers['cache-control'])
        self.assertEqual(self.client.get('/favicon.svg').status_code, 200)

    def test_files_outside_the_build_are_not_served(self):
        name = Path(self.tmp.name).name + '-secret.txt'
        response = self.client.get(f'/..%2F{name}')
        self.assertNotIn('secret', response.text)

    def test_gateway_adds_the_server_key(self):
        response = self.client.get('/research-gateway/api/v1/earth',
                                   headers={'X-API-Key': 'wrong', 'X-Audience-Type': 'engineer'})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['data']['themes'])

    def test_gateway_only_forwards_allowlisted_routes(self):
        for path in ['/research-gateway/api/v1/admin/investigations/PSI-25/refresh', '/research-gateway/docs',
                     '/research-gateway/api/v1/jobs/1']:
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_backend_routes_are_not_shadowed(self):
        self.assertNotIn('<title>app</title>', self.client.get('/openapi.json', headers=HTML).text)
        self.assertEqual(self.client.get('/api/v1/earth').status_code, 401)
