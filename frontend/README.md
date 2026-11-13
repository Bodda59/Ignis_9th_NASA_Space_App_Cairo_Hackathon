# Flame in Freefall — frontend

Fire-safety insights from NASA microgravity combustion research. A React app for exploring, comparing, ranking and asking questions about the NASA Physical Science Informatics (PSI) combustion investigations, built for NASA Space Apps 2026.

All data comes from the research backend in [`../backend`](../backend). The frontend has no mock mode: without a running backend, pages show their error state.

## Getting started

Requires Node.js 20.19+ or 22.12+.

**1. Run the backend.** It needs the team's initialized PostgreSQL + pgvector database, `RAG_API_KEY`, and an LLM provider key for cited answers. See [backend/research/README.md](../backend/research/README.md):

```bash
cd backend
uv sync --locked
uv run --locked uvicorn main:app      # http://127.0.0.1:8000
```

**2. Run the frontend:**

```bash
cd frontend
npm install
npm run dev                            # http://127.0.0.1:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server (with the API proxy) |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally (with the API proxy) |
| `npm run lint` | Lint with oxlint |

The build warns that two chunks are larger than 500 kB (the main bundle and the three.js renderer). That's expected: the 3D scenes are already lazy-loaded.

## How the frontend reaches the backend

The browser only ever calls its own origin at `/research-gateway/...`. The Vite dev and preview servers forward those requests to the backend (`vite.config.ts`):

- **Target:** `RAG_BACKEND_URL`, default `http://127.0.0.1:8000`.
- **API key:** the proxy adds `X-API-Key` on the server side, so the key is never in the browser or the built bundle. It uses `RAG_API_KEY` from `frontend/.env`, then `backend/.env`, then the repository root `.env`. Usually the backend's `.env` is enough and nothing needs setting here. See `.env.example`.
- **Allowlist:** only the research endpoints the app uses are forwarded: filters, relevance, investigations, rank, interpret, scenario, learning materials and audiences. Admin routes are not.
- **Audience:** every request carries `X-Audience-Type` from the research lens picker.

`npm run build` output contains no proxy. To deploy, put a reverse proxy in front of `dist/` that does the same thing: forward `/research-gateway/*` to the backend with the prefix stripped, and add the API key.

Code map: `src/api/client.ts` is the one adapter the views call. `live.ts` reshapes the responses that need it, `transport.ts` does the HTTP, and `types.ts` is the contract.

## Pages

| Route | Page |
|---|---|
| `/` | Landing page: flame hero, 3D experiment journey, search, ISS racks, habitats, gravity, oxygen map, timeline |
| `/explore` | Search with filters, habitat context and ranked result cards |
| `/investigations/:id` | Study detail (e.g. `/investigations/PSI-25` for BASS-II): summary, test conditions, findings, safety design links, experiment tables, learning materials, sources |
| `/compare?ids=a,b` | Side-by-side comparison of 2–3 studies |
| `/rank` | Rank evidence by question, test-condition scenario or crew environment |
| `/ask` | Source-grounded Q&A chat with citations |

Study ids are the catalog ids from `backend/data_pipeline/sources/investigations.json` (`PSI-25` BASS-II, `PSI-69` FLEX, …).

A guided tour opens on the first visit. To see it again, clear the `flame-in-freefall:tour:v2` key from localStorage.

## Folder map

```
src/
  api/          client.ts (the one API adapter), live.ts, transport.ts, types.ts (contract), errors.ts, citation.ts
  pages/        one component per route
  features/     page building blocks, grouped by feature
    landing/ station/ habitat/ search/ rank/ compare/ summarize/
    equipment/ export/ learning/ interpret/ audience/ onboarding/
  components/
    ui/         Button, Chip, Panel, StateMessage, citation chips, evidence badges…
    fx/         Starfield, RevealText, CountUp
    layout/     AppShell, TopNav, Footer
  hooks/        useAsync (cancellable loading), useSpotlight
  lib/          cn, labels, smooth scroll
  index.css     Tailwind v4 design tokens (see DESIGN.md)
public/models/  astronaut.glb
```

Design rules, colors, type and accessibility requirements are in [DESIGN.md](DESIGN.md).

## Credits

- 3D astronaut: "Astronaut" by PW Wu, [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/), via [Poly Pizza](https://poly.pizza/m/erlAEWfFKH3). Also credited in the app.
- Study content: NASA Physical Science Informatics and the NASA Space Apps 2026 "Flame in Freefall" challenge brief.

This is a research and planning tool. It doesn't give emergency instructions and doesn't certify any material, habitat or condition as safe.
