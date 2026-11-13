"""Original and scenario-based research endpoints."""
from fastapi import Depends

from rag.models import Query


def register_routes(app, execute, authorize):
    @app.post('/rank', dependencies=[Depends(authorize)], tags=['General search'])
    def rank(query: Query):
        return execute('rank', query)

    @app.post('/interpret', dependencies=[Depends(authorize)], tags=['General search'])
    def interpret(query: Query):
        """Answer a general question with citations and output validation.

        Set investigation_ids to [the current ID] on an investigation page; omit it or send [] globally.
        """
        return execute('interpret', query)
