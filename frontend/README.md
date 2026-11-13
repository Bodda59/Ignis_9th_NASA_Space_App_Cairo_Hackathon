# Flame in Freefall — frontend

Fire-safety insights from NASA microgravity combustion research. A React app for exploring, comparing, ranking and asking questions about the NASA Physical Science Informatics (PSI) combustion investigations, built for NASA Space Apps 2026.

> **This branch runs on bundled mock data only.** There is no backend connection, no API key and no environment variable to set. Every `api.*` call is answered by `src/mocks/mockServer.ts`. Connecting the real research backend happens in a later branch.

## Getting started

Requires Node.js 20.19+ or 22.12+.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with oxlint |

The build warns that two chunks are larger than 500 kB (the main bundle and the three.js renderer). That's expected: the 3D scenes are already lazy-loaded.

## Pages

| Route | Page |
|---|---|
| `/` | Landing page: flame hero, 3D experiment journey, search, ISS racks, habitats, gravity, oxygen map, timeline |
| `/explore` | Search with filters, habitat context and ranked result cards |
| `/investigations/:id` | Study detail: summary, test conditions, findings, safety design links, experiment tables, learning materials, sources |
| `/compare?ids=a,b` | Side-by-side comparison of 2–3 studies |
| `/rank` | Rank evidence by question, test-condition scenario or crew environment |
| `/ask` | Source-grounded Q&A chat with citations |

A guided tour opens on the first visit. To see it again, clear the `flame-in-freefall:tour:v2` key from localStorage.

## About the mock data

The sample collection (`src/mocks/fixtures.ts`) holds 14 real PSI investigations plus one synthetic study:

- **Real studies** (BASS, BASS-II, Saffire, SAME, SAME-R, DAFT, FLEX, FLEX-2, CFI, ACME BRE / CFI-G / E-FIELD, SPICE, SLICE) contain only facts stated in the 2026 challenge brief, each cited to its brief section. Anything the brief doesn't state shows as "Not reported". Nothing is invented.
- **`fixture-demo`** is a clearly labeled synthetic study. It's the only study with test-level records, so it's the one to use for the experiment table, CSV/JSON export and scenario ranking. Its values are placeholders and are marked as such everywhere.
- **Ask** is answered by a small rule set (`src/mocks/interpret.ts`), not a language model. It answers only from brief passages and otherwise returns "insufficient evidence".
- **Learning materials** (PDF, Word and PowerPoint) need a document generator, so offline they report that they aren't available.

### Forcing demo states

Add `?mock=<state>` to any page URL to show loading, error and empty states without a backend:

| State | Effect | Calls that honor it |
|---|---|---|
| `slow` | Long delay (2.5 s, 6 s for Ask) | search, investigation, compare, interpret, rank |
| `error` | Service-unavailable error with Retry | search, investigation, compare, interpret, rank |
| `timeout` | Timeout error with Retry | search, interpret |
| `empty` | No results | search, rank |
| `ratelimit` | Too-many-requests error | interpret |

For example: `http://localhost:5173/explore?q=smoke&mock=error`.

## Folder map

```
src/
  api/          client.ts (the one API adapter), types.ts (contract), errors.ts, citation.ts
  mocks/        mockServer.ts + fixtures, details, compare, interpret, csv
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
