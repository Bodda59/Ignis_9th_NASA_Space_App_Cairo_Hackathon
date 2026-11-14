# Flame in Freefall

Flame in Freefall is Team Ignis’s project for the NASA International Space Apps Challenge in Cairo. It turns NASA’s Physical Science Informatics (PSI) combustion investigations into a searchable research dashboard and interactive lessons. Students, educators, researchers, and engineers can explore how flames behave in microgravity and trace findings to the original report or test record.

## What you can do

| Page | What it shows |
| --- | --- |
| [Home](http://127.0.0.1:5173/) | Watch the opening film and explore a 3D experiment journey, the ISS research environment, and examples of how gravity and oxygen affect combustion. |
| [Studies](http://127.0.0.1:5173/explore) | Search the PSI combustion catalog and filter by safety topic, gravity, material, or crew environment. Open a study for findings, source notes, test conditions, and experiment tables. |
| [Compare](http://127.0.0.1:5173/compare?ids=PSI-25,PSI-69) | Compare two or three studies side by side. The linked example compares BASS-II and FLEX. |
| [Rank studies](http://127.0.0.1:5173/rank) | Rank by a research question, a set of test conditions, or a crew environment. See the strongest matching evidence by source type and open the underlying records. |
| [Ask AI](http://127.0.0.1:5173/ask) | Ask for a cited explanation. The app can report insufficient evidence when the available sources do not support an answer. |
| [Articles](http://127.0.0.1:5173/article), [Gravity](http://127.0.0.1:5173/gravity), and [Earth](http://127.0.0.1:5173/earth) | Read related NASA resources beyond PSI, examine the partial-gravity evidence gap, and see the Earth applications described in NASA records. |
| [Kids Lab](http://127.0.0.1:5173/kids) | Use a flame slider, explore simplified NASA experiment summaries, and learn through quizzes and games such as Experiment Detective and Fire Patrol. |
| [Fire Safety Officer](http://127.0.0.1:5173/mission) | Play three educational missions about fire prevention, detection, and suppression. |

Study pages support table previews and exports, plus downloadable learning materials in Word, PDF, and PowerPoint where available. Relevance scores measure how closely evidence matches a query. The dashboard is intended for research and education.

## Dashboard screenshots

**Research catalog.** Searching for BASS-II shows how the catalog lists matching investigations and filters.

![Research dashboard with the BASS-II query, filters, and investigation results](docs/screenshots/catalog.jpg)

**Investigation details.** The BASS-II page shows the study’s overview, indexed source types, and links to evidence.

![BASS-II detail page showing indexed document categories and study navigation](docs/screenshots/investigation.jpg)

**Scenario Evidence Map.** A BASS-II material query shows the matching record and where to open its source.

![BASS-II scenario Evidence Map with source links](docs/screenshots/scenario-evidence.jpg)

**Kids Lab and Fire Safety Officer.** The two learning experiences introduce the same research through a visual flame lesson and an interactive mission.

![Kids Lab homepage with the Orbi guide and interactive flame slider](docs/screenshots/kids.jpg)

![Fire Safety Officer mission dashboard with its Start mission button](docs/screenshots/mission.jpg)

## Run locally

### 1. Install the prerequisites

- Python 3.14 and [uv](https://docs.astral.sh/uv/getting-started/installation/).
- Node.js 20.19+ in the 20.x line or 22.12+ and npm.
- Access to an initialized Supabase PostgreSQL database with pgvector and the project’s indexed NASA data. The application can start before the database is ready, but catalog search and evidence lookup require populated tables.

Open two terminals at the repository root.

### 2. Configure the environment

Create an ignored `.env` file in the repository root and fill in your own values. Keep any existing settings if the file is already present.

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require"
RAG_API_KEY="replace-with-your-local-api-key"

# Used for cited answers. Omit these two settings if you only need search and ranking.
LLM_PROVIDER=groq
GROQ_API_KEY="replace-with-your-groq-key"
```

The backend reads process variables first, then `backend/.env`, then the root `.env`. Vite can reuse the same `RAG_API_KEY` and adds it to backend requests on the server side. See the [research setup](backend/research/README.md) for other language model providers and embedding configuration.

For a new Supabase project, follow the [backend setup](backend/README.md) to apply the migrations, ingest source files, and publish catalog data. Schema initialization alone creates empty tables.

### 3. Start FastAPI in Terminal 1

```sh
cd backend
uv sync --locked
uv run --locked python main.py serve
```

Open [Swagger UI](http://127.0.0.1:8000/docs) for API schemas, or check that the server responds.

```sh
curl -f http://127.0.0.1:8000/health
```

The health check confirms the API is up. Loading an investigation in the frontend also exercises the database. When calling protected routes directly from Swagger or a script, send `X-API-Key` and, where required, `X-Audience-Type` (for example, `engineer`).

### 4. Start React in Terminal 2

```sh
cd frontend
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) or the URL Vite prints if that port is taken. Vite forwards `/research-gateway` requests to FastAPI on port `8000`. If you start FastAPI on another port with `uv run --locked python main.py serve --port PORT`, set `RAG_BACKEND_URL` in `frontend/.env` to the matching URL and restart Vite. Press **Ctrl+C** in each terminal when you’re done.

### 5. Try a complete research flow

1. Search for **BASS-II** in **Studies** and open the result, **PSI-25**.
2. Review the indexed source types, then open **Source data & export** to inspect a table.
3. Open the [prefilled BASS-II scenario](http://127.0.0.1:5173/rank?mode=scenario&ids=PSI-25&example=bass-ii), select **Rank investigations**, and choose **View source** in the Evidence Map.
4. In **Ask AI**, ask “What materials did BASS-II test?” and open a citation from the answer. This step requires a configured language model provider.

If `uv run --locked` reports that it cannot find `uv.lock`, check that you’re in `backend/` and that the checkout contains `backend/uv.lock`. If catalog pages return `401`, check that Vite and FastAPI use the same `RAG_API_KEY`. For a `503` accompanied by a PostgreSQL connection timeout, check that the Supabase project is active and its database host and port are reachable.

## Data and architecture

- [`frontend/`](frontend/) contains the React and TypeScript interface, the Vite development proxy, and the interactive visualizations and games.
- [`backend/dashboard/`](backend/dashboard/) serves the catalog, study details, comparisons, and data exports.
- [`backend/research/`](backend/research/) handles question ranking, reported-condition matching, crew-environment relevance, and cited answers.
- [`backend/data_pipeline/`](backend/data_pipeline/) ingests NASA PDF, TXT, and CSV sources, stores searchable passages and normalized test conditions in PostgreSQL, and publishes catalog data.
- In question mode, the ranker searches source types such as reports, science documents, and engineering documents in parallel. Scenario matching checks which conditions appear together in a reported record and exposes gaps in the Evidence Map.

## Checks and deployment

```sh
# From backend/
uv run --locked python -m unittest discover -s research -v

# From frontend/
npm run lint
npm run build
```

The production container serves the built frontend and FastAPI from one URL. The GitHub Actions workflow builds and deploys it to Azure Container Apps when changes land on `main`. See [Azure deployment](DEPLOY.md) for configuration and rollout steps, and the [frontend guide](frontend/README.md) for local build and proxy details.
