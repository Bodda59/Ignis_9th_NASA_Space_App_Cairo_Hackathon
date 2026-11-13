# Flame in Freefall

Flame in Freefall is Team Ignis’s NASA Space Apps Cairo hackathon project. It helps students, researchers, and engineers explore NASA combustion experiments, see how flames behave in microgravity, and trace findings back to the original report or test record.

## What works today

- **Explore and compare investigations.** Search the catalog, open investigation details and source metadata, compare studies, and preview or export experiment tables.
- **Ask questions with citations.** Rank relevant investigations by keyword and semantic similarity. Ask a question to get a cited answer or an explanation that the available evidence is insufficient.
- **Explore experimental conditions.** Filter by reported material, oxygen concentration, or airflow where available. The Evidence Map shows which conditions were reported together in a single record, which were reported separately, and where evidence is missing.
- **Review crew-environment relevance.** See which investigations are relevant to a selected habitat or fire-safety concern, with matching test records and gaps in coverage.
- **Export learning materials.** Generate lecture slides in PowerPoint and study materials in Word or PDF.
- **Index NASA source files.** The data pipeline reads PDF, TXT, and CSV files, stores searchable passages and normalized test conditions in PostgreSQL with pgvector, and publishes the investigation catalog.

The backend is available on `main`. A React frontend is in progress on `feature/frontend-migration`. The research tools describe reported experiments and their limits. Fire-safety certification is outside the project’s scope.

## Run the backend

Install [uv](https://docs.astral.sh/uv/) and use Python 3.14. Configure `DATABASE_URL` for an initialized PostgreSQL database with pgvector and `RAG_API_KEY` in the repository’s ignored `.env` or in the process environment. Cited answers also require credentials for the configured LLM provider.

```sh
cd backend
uv sync --locked
uv run --locked python main.py serve
```

Open [Swagger UI](http://127.0.0.1:8000/docs) to explore the API. Send `X-API-Key` on protected requests and `X-Audience-Type` on investigation routes that require an audience.

Try ranking BASS-II (`PSI-25`) with `POST /rank`, then open its detail page through `GET /api/v1/investigations/PSI-25/detail` to inspect the test records and citations.

See [backend setup](backend/README.md) for database initialization and catalog publishing, and [research API examples](backend/research/README.md) for ranking, cited answers, and scenarios.
