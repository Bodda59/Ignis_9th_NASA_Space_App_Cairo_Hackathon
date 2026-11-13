"""Original and scenario-based research endpoints."""
from fastapi import Depends

from rag.models import Query


def register_routes(app, execute, authorize):
    @app.post('/rank', dependencies=[Depends(authorize)], tags=['General search'])
    def rank(query: Query):
        return execute('rank', query)
