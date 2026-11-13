"""Original and scenario-based research endpoints."""
from fastapi import Depends, Header, Request

from dashboard.audience import Audience
from research.crew import ResearchRequest
from rag.models import Query
from rag.scenario import ScenarioCompare, ScenarioOptions, ScenarioQuery, ScenarioQuestion, ScenarioScope


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

    @app.post('/scenario/fields', dependencies=[Depends(authorize)], tags=['Scenario search'])
    def scenario_fields(query: ScenarioScope):
        """Discover conditions, canonical units, source coverage and per-record condition sets."""
        return execute('scenario_fields', query)

    @app.post('/scenario/options', dependencies=[Depends(authorize)], tags=['Scenario search'])
    def scenario_options(query: ScenarioOptions):
        """Find compatible next filters using only records matching the current selections."""
        return execute('scenario_options', query)

    @app.post('/scenario/rank', dependencies=[Depends(authorize)], tags=['Scenario search'])
    def scenario_rank(query: ScenarioQuery):
        """Compare reported conditions within individual source records; no LLM generation."""
        return execute('scenario_rank', query)

    @app.post('/scenario/compare', dependencies=[Depends(authorize)], tags=['Scenario search'])
    def scenario_compare(query: ScenarioCompare):
        """Show ranking/category/source-record changes between two explicit scenarios."""
        return execute('scenario_compare', query)

    @app.post('/scenario/interpret', dependencies=[Depends(authorize)], tags=['Scenario search'])
    def scenario_interpret(query: ScenarioQuestion):
        """Answer from confirmed scenario records, with citation checks and ranked evidence.

        Use one investigation_ids entry on an investigation page; omit it or send [] for global search.
        Missing/conflicting analogue records never enter the LLM context.
        """
        return execute('scenario_interpret', query)

    @app.get('/api/v1/research/filters', dependencies=[Depends(authorize)], tags=['Crew environment'])
    def crew_filters(request: Request, audience: Audience = Header(alias='X-Audience-Type')):
        return {'data': execute('crew_filters', None), 'meta': {'audience': audience, 'request_id': request.state.request_id}}

    @app.post('/api/v1/research/relevance', dependencies=[Depends(authorize)], tags=['Crew environment'])
    def crew_relevance(query: ResearchRequest, request: Request, audience: Audience = Header(alias='X-Audience-Type')):
        return {'data': execute('crew_relevance', query), 'meta': {'audience': audience, 'request_id': request.state.request_id}}
