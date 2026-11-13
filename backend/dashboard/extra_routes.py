"""Health, learning materials, and audience endpoints."""
from fastapi import Depends, HTTPException
from fastapi.responses import JSONResponse, Response

from dashboard.audience import audience_catalogue
from dashboard.learning import (
    LearningRequest, example as learning_example, export_docx, export_pptx,
    generate as generate_learning, source_materials,
)
from dashboard.learning_pdf import export_pdf


def register_dashboard_extras(app, engine, execute, authorize):
    @app.get('/health')
    def health():
        try:
            return engine().store.health()
        except Exception:
            raise HTTPException(503, 'Database is not configured, initialized, or reachable.') from None

    @app.post('/learning/materials', dependencies=[Depends(authorize)], tags=['Learning materials'])
    def learning_materials(query: LearningRequest, output: str = 'json', example: bool = False, excerpts: bool = False):
        if output not in {'json', 'pptx', 'docx', 'pdf'}:
            raise HTTPException(400, 'Choose json, pptx, docx or pdf.')
        if output == 'pptx' and query.audience != 'professor':
            raise HTTPException(400, 'Select professor for lecture slides.')
        if output == 'docx' and query.audience == 'professor':
            raise HTTPException(400, 'Select undergraduate or graduate for study notes.')
        if example:
            pack = learning_example(query)
            if pack is None:
                raise HTTPException(400, 'The reviewed example covers BASS-II with no custom topic.')
        elif output == 'pdf' or excerpts:
            pack = execute(lambda request: source_materials(engine(), request, slides=output == 'pptx'), query)
        else:
            pack = execute(lambda request: generate_learning(engine(), request), query)
        if pack['status'] != 'ready':
            return JSONResponse(status_code=422, content=pack)
        if output == 'json':
            return pack
        if output == 'pdf':
            data, media_type = export_pdf(pack, query.notes), 'application/pdf'
        else:
            data = export_pptx(pack) if output == 'pptx' else export_docx(pack)
            kind = 'presentationml.presentation' if output == 'pptx' else 'wordprocessingml.document'
            media_type = 'application/vnd.openxmlformats-officedocument.' + kind
        return Response(data, media_type=media_type,
                        headers={'Content-Disposition': f'attachment; filename="{query.investigation_id}-{query.audience}.{output}"',
                                 'Cache-Control': 'no-store'})

    @app.get('/audiences', dependencies=[Depends(authorize)], tags=['Audience preferences'])
    def audiences():
        """Discover exactly five audience profiles, defaults and workflow recommendations."""
        return audience_catalogue()
