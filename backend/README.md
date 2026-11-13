# Flame in Freefall backend

From this directory, install the locked dependencies and start FastAPI.

```sh
uv sync --locked
uv run --locked python main.py serve
```

Configure `DATABASE_URL` and `RAG_API_KEY` in the repository's ignored `.env`
or in the process environment. Open `/docs` for request schemas. Catalog routes
under `/api/v1` require `X-API-Key`. Investigation routes also require
`X-Audience-Type`, for example `engineer`. Use a separate
`CATALOG_ADMIN_API_KEY` for catalog writes.

On a Supabase database with the migration permissions, run
`uv run --locked python main.py init-db` to apply the schema. The migrations
reference Supabase's `anon`, `authenticated`, and `service_role` roles.
Use `python main.py ingest --help` for file indexing and
`uv run --locked python -m data_pipeline.job worker --once` to publish runnable
catalog jobs. The health endpoint is `/health`.

The dashboard API provides investigation search, metadata, details, comparisons,
table previews and exports, and crew-environment filters and relevance.
`/learning/materials` provides PDF, Word, and PowerPoint exports.
See [research setup](research/README.md) for ranking, cited answers, and scenarios.
