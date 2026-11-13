# Flame in Freefall research API

Run from the Ignis repository root.

```sh
cd backend
uv sync --locked
uv run --locked python -m unittest discover -s research -v
uv run --locked uvicorn main:app
```

Set `DATABASE_URL` and `RAG_API_KEY` in the process environment or in the repository’s ignored
`.env` file. A `backend/.env` file takes precedence over the root file. The backend reads the team's initialized PostgreSQL/pgvector
database. General ranking reads indexed passages, scenario search reads normalized
scenario records, and crew relevance reads the published investigation and test
catalog. Apply the data pipeline's migrations, ingestion, and catalog publishing
before using the API with new datasets.

General ranking and scenario questions use the embedding model that indexed the
database. The default is `BAAI/bge-small-en-v1.5`. Set `EMBEDDING_MODEL` if the
index uses a different 384-dimensional model. The first embedding call loads
the model from Hugging Face or the local cache.

Cited answers additionally require `LLM_PROVIDER` and the matching API key.
Groq is the default and uses `GROQ_API_KEY`. The other providers are
`openrouter`, `gemini`, and `zai`. OpenRouter also requires `OPENROUTER_MODEL`.
See [providers.py](providers.py) for the supported model settings.

Send `X-API-Key` on each research request. Crew endpoints also require
`X-Audience-Type` with a supported value such as `engineer`.

| Endpoint | Purpose |
| --- | --- |
| `POST /rank` | Rank investigations and return their strongest source passages. |
| `POST /interpret` | Answer a question with validated citations or abstain. |
| `POST /scenario/fields` and `POST /scenario/options` | Discover normalized conditions and compatible filters. |
| `POST /scenario/rank` and `POST /scenario/compare` | Match conditions within individual records and show gaps in the Evidence Map. |
| `POST /scenario/interpret` | Answer using records that confirm all selected conditions. |
| `GET /api/v1/research/filters` and `POST /api/v1/research/relevance` | Discover crew-environment filters and find relevant studies with source references and evidence gaps. |

Try `{"question":"BASS-II","investigation_ids":["PSI-25"]}` at `/rank` and
`{"investigation_ids":["PSI-25"],"conditions":[{"key":"material","value":"0.5\" black rod"}]}`
at `/scenario/rank`. The response includes the source location for each
matching record. The scores describe relevance to reported evidence. Crew
environment gaps remain visible alongside any matching test conditions.
