# Flame in Freefall

Flame in Freefall is Team Ignis’s NASA Space Apps Cairo hackathon project. It helps students, researchers, and engineers explore NASA combustion experiments, see how flames behave in microgravity, and trace findings back to the original report or test record.

## What works today

- **Explore and compare investigations.** Search the catalog, open investigation details and source metadata, compare studies, and preview or export experiment tables.
- **Ask questions with citations.** Rank relevant investigations by keyword and semantic similarity. Ask a question to get a cited answer or an explanation that the available evidence is insufficient.
- **Explore experimental conditions.** Filter by reported material, oxygen concentration, or airflow where available. The Evidence Map shows which conditions were reported together in a single record, which were reported separately, and where evidence is missing.
- **Review crew-environment relevance.** See which investigations are relevant to a selected habitat or fire-safety concern, with matching test records and gaps in coverage.
- **Review the partial-gravity gap.** The gravity page shows that PSI has no Moon or Mars combustion tests, lists the studies that compare microgravity with Earth gravity, explains E-FIELD's simulated effect, and links NASA partial-gravity tests published outside PSI.
- **See the Earth applications.** Each investigation page shows NASA's stated research impacts and Earth benefits, with its DOI. The Earth page groups the studies by the Earth fire-safety problem they name and lists the NASA spin-offs already in use.
- **Export learning materials.** Generate lecture slides in PowerPoint and study materials in Word or PDF.
- **Index NASA source files.** The data pipeline reads PDF, TXT, and CSV files, stores searchable passages and normalized test conditions in PostgreSQL with pgvector, and publishes the investigation catalog.

The React frontend and FastAPI backend are integrated on `main`. The research tools describe reported experiments and their limits. Fire-safety certification is outside the project’s scope.

## Run locally

Use Python 3.14 with [uv](https://docs.astral.sh/uv/) and Node.js 20.19+ in the 20.x line or 22.12+ with npm. Run both services from the repository on `main`, each in its own terminal.

Set `DATABASE_URL` to the team's initialized PostgreSQL database with pgvector and set `RAG_API_KEY` in the repository root's ignored `.env`. For cited answers, also configure the LLM provider and its credentials. See [backend setup](backend/README.md) for database initialization and catalog publishing.

### Terminal 1 — Backend

From the repository root, run:

```sh
cd backend
uv sync --locked
uv run --locked python main.py serve
```

The API runs at `http://127.0.0.1:8000`. Check the [health endpoint](http://127.0.0.1:8000/health) or explore the routes in [Swagger UI](http://127.0.0.1:8000/docs).

### Terminal 2 — Frontend

From the repository root, run:

```sh
cd frontend
npm ci
npm run dev
```

Open [Flame in Freefall](http://127.0.0.1:5173). Vite forwards requests under `/research-gateway` to the backend on port `8000` and adds `X-API-Key` on the server side. It can reuse `RAG_API_KEY` from the repository root's `.env`. If you run the backend on a different port, set `RAG_BACKEND_URL` in `frontend/.env` and restart Vite. See [frontend setup](frontend/README.md) for proxy settings and build commands.

Try searching for **BASS-II** in Explore and opening its investigation page to inspect test records and citations. See [research API examples](backend/research/README.md) for direct requests to rank evidence, ask questions, and explore scenarios.
