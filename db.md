You are continuing the Flame in Freefall NASA hackathon project. Inspect the checked-out repository and connected Supabase database, then audit and fix the next investigation I name. Do the work through verification; do not stop at a proposed plan. Ask me which investigation to audit if I have not named one. This prompt supplies context, not proof: verify current code, database contents and Git state before acting.

## Goal and scope

Make every section of that investigation's Explore detail page accurate against the data and source documents already available: overview/objectives, materials, reported conditions, measurements/diagnostics, reviewed findings, source notes and limitations, safety design links, Earth applications, source table, pagination, exports and references.

Understand what each source row actually represents before counting or interpreting it. Different investigations have different schemas and meanings. Daily summaries, test attempts, successful ignitions, repeated burns, planned profiles, maintenance activities and physical specimens are different quantities. Do not populate a generic table with invented numbers or misleading zeros.

Use the existing dataset. Do not expand the dataset, add replacement datasets, restore deleted legacy tables, or introduce new features. The old separate experiment tables were intentionally removed. Do not recreate them. Preserve teammates' features and all unrelated work. Read Project_Description as project context when useful, not as application content.

## Repository and runtime

- Repository: Ignis_9th_NASA_Space_App_Cairo_Hackathon. On the original machine: /Users/youssefrezk/Downloads/Ignis_9th_NASA_Space_App_Cairo_Hackathon.
- Remote: https://github.com/Bodda59/Ignis_9th_NASA_Space_App_Cairo_Hackathon.git; development branch main. Inspect Git status first; staged and unstaged work may coexist. Never discard changes or force-push.
- Frontend: React, TypeScript, Vite, Tailwind; normally http://127.0.0.1:5173.
- Backend: Python 3.14+, FastAPI, psycopg/Postgres, hybrid RAG and embeddings; dependencies managed by uv and uv.lock.
- Backend setup/start, from backend/: `uv sync --locked`, then `uv run --locked python main.py serve`.
- Frontend setup/start, from frontend/: `npm ci`, then `npm run dev`.
- Use existing environment configuration. Never print or commit .env, database passwords or API keys. API routes use X-API-Key and an audience header; inspect the API client and backend schemas.
- Supabase project reference used in this work: juucrlcukavjzdoyukal. Prefer the connected Supabase tools. If access is unavailable, explain the blocker; do not claim to have checked stored data.
- After pulling teammate changes, sync dependencies before validation. Recent teammates added psycopg-pool and the Fredoka font, plus Kids Lab, Gravity, intro video and other UI features. Keep them.

## Where the data and implementation live

Read these paths and their callers; filenames are starting points, not a substitute for tracing the current implementation:

- backend/dashboard/dashboard.py: investigation detail response, counts, reviewed sections and citations.
- backend/dashboard/service.py: catalog, audience projections, table pagination and CSV/JSON export.
- backend/data_pipeline/reviewed.py: manually verified, investigation-specific report details and findings. REPORT_DETAILS and REVIEWED use document IDs/content hashes to guard claims against a source revision. Do not bypass that guard when sources change.
- backend/data_pipeline/scenario_profiles/: per-investigation CSV extraction profiles.
- backend/data_pipeline/conditions.py: parsing, unit conversion, usable/missing/ambiguous/invalid values and record classification.
- backend/data_pipeline/materialize.py and facts.py: derived tests, samples, measurements, tables and summary facts.
- backend/data_pipeline/import_metadata.py: source metadata and reviewed measurement mappings.
- backend/research/crew.py: research filters/relevance and cached catalog. Preserve incoming caching/pooling behavior.
- backend/research/test_detail.py: regression checks for the investigation audits, source tables and exports.
- frontend/src/pages/InvestigationPage.tsx and frontend/src/api/types.ts: page sections and response types.
- frontend/src/features/export/ExperimentTables.tsx: fixed-height source table, column selection, 10-row pagination and export.
- frontend/src/features/summarize/{DetailHero,SectionNav,SourcesList}.tsx and frontend/src/components/ui/{CitationChip.tsx,citations.ts}: counts, navigation, compact references and citation navigation.

Supabase data flow:

1. rag_investigations stores metadata/objectives. rag_documents stores indexed file identities, hashes, profiles and source URLs.
2. rag_passages stores CSV row_data/text or report/TXT passages, locations and embeddings. TXT may be a transcription of an original XLSX, DOCX, PPTX or PDF. Identify the original format and worksheet/page context.
3. rag_scenario_profiles, rag_scenario_records, rag_scenario_fields and rag_scenario_values store extraction mappings and normalized values.
4. investigation_tests, investigation_samples, test_samples and investigation_measurements are derived catalog records.
5. experiment_tables, experiment_table_columns and experiment_table_rows serve previews and exports.
6. investigation_summaries has audience-specific published facts; investigation_search, search_terms, caches and background_jobs must stay consistent with source revisions.

Inspect the actual schema before updates. There are multiple audience summaries; the preceding audits found five. Do not assume the count forever.

## Audit workflow

1. Identify the exact PSI ID from title/metadata. Do not confuse related investigations such as BASS with BASS-II. Read the current page and response to establish the existing problems.
2. Inventory all indexed files and all CSV rows. Read source headers, units, blank/sentinel values, repeated labels, dates, worksheets, operating notes, instrument calibration and relevant report sections. Compare raw passages, normalized records, materialized tables and displayed values. Examine the full dataset, not only the first preview page or a few retrieval hits.
3. Distinguish actual experiment results from objectives, planned capabilities, hardware settings, ground comparisons and simulations. Endpoint oxygen is not automatically constant throughout a burn. Fan voltage is not airflow. Instrument gain is not temperature. A CSV row does not prove successful ignition. A project date range is not continuous flight-testing duration.
4. For every suspected error, establish evidence from the source context. Correct only supported errors. Preserve legitimate zeros, ignition failures, repeated runs and uncertain entries. Never deduplicate solely by test/sample labels. Leave unresolved disagreements explicit rather than choosing a plausible number.
5. Fix confirmed stored errors in Supabase, not only React display logic. Synchronize affected source text/row_data, normalized values, derived tests/samples/measurements, preview/export rows and provenance. Refresh changed passage embeddings with the document's existing embedding model; previous data used BAAI/bge-small-en-v1.5 (384 dimensions). Recompute document/index signatures and source revision through the existing conventions; update summaries, search and affected caches/jobs consistently.
6. Use a guarded transaction and exact expected counts for targeted corrections. Keep valid IDs/relationships. Do not rebuild the whole catalog or reingest old uncorrected files indiscriminately. Source corrections already saved in Supabase are not reproduced merely by checking out Git. Do not alter an author's original report silently to make it agree with a correction.
7. Reuse REPORT_DETAILS for reviewed wording and conditions_view='source_tables' when the generic conditions table cannot represent the source. Use exact citations for claims and source notes. Keep source revision guards. Add minimal regression checks for actual failure modes.
8. Verify the database after mutation, then run tests/build/lint. Restart the backend once after completing code changes; the user usually runs it manually. Ask for Ctrl+C and `uv run --locked python main.py serve` in the backend terminal, leaving the frontend running, then verify after they confirm.
9. Test the real page: every pagination page, Previous/Next, last-page count, stable scroll position, zero vs blank rendering, all displayed cells, CSV/JSON parity, audience behavior, citation focus/expansion and NASA link. Exports use existing spreadsheet formula-injection escaping; account for the leading apostrophe on negative-looking CSV text rather than removing the protection.
10. Report what was fixed, what remains uncertain and how it was verified. Be precise about source errors versus implementation errors; do not say everything is scientifically reconciled when it is not.

## Presentation requirements

- User-facing wording should describe the research and actual source limitations. Do not add repair-history banners such as '4 stored values have been corrected' or internal cleaning/debug messages.
- Keep references compact: group them by document in expandable groups, while retaining exact page/row/cell citations. Clicking a citation must open its group and focus its exact reference.
- Link the investigation to `https://psi.nasa.gov/physci/repo/data/investigations/PSI-ID` using the actual ID. Verify that the link loads the investigation and dataset listing; do not turn local filenames into fabricated download URLs.
- Keep the fixed-height table and 10-row pagination. Navigation counts must match source rows for source-table views, including retained activities or failed attempts where applicable.
- Do not create a docs folder, backup tables, permanent data dumps or one-off cleanup scripts in the repository. Temporary preparation files can go outside the repo and should be removed afterward. This handoff file was explicitly requested by the user.
- The user prefers plain explanations and wants work completed without repeated permission requests. Ask only for genuinely missing access/information or an action blocked by the environment.

## Investigations already audited

Verify the current implementation, but do not redo or undo these audits without a reason:

| PSI ID | Investigation | Important preserved distinctions |
| --- | --- | --- |
| PSI-20 | ACME Burning Rate Emulator (BRE) | 18 daily source rows, not 18 flames; daily ignition counts and qualified oxygen descriptions; report-backed findings. |
| PSI-21 | ACME CLD | Daily/grouped log semantics; controller capacity is not actual flow; bottle concentration is not ambient oxygen. |
| PSI-159 | ACME Cool Flames Investigation with Gases (CFI-G) | Preserve source annotations/formula errors; derived Kelvin must require reported Celsius; burner temperature is not flame temperature. |
| PSI-10 | ACME Flame Design | Two tables: 207 normal + 120 inverse rows; normal/inverse oxygen meanings differ; ramped conditions remain qualified; unresolved identifier/count differences are documented. |
| PSI-23 | ACME s-Flame | 18 daily entries describe 276 nominally sustained ignitions (145 nitrogen-diluted, 131 helium-diluted); fuel/diluent wording, dates and bottle IDs were checked. |
| PSI-26 | BASS | 122 rows = 121 non-maintenance entries + one soot-cleaning activity; cleaning is not a fuel/test. Two date typos fixed. Repeated labels remain. Seven date/GMT conflicts and report/log count differences remain documented. |
| PSI-25 | BASS-II | 129 rows: 126 entries in 2014 + three documented Olson follow-up tests in 2016. Two dates, one GMT label and three material labels corrected. Five unsupported calibrated final-O2 endpoints (B2, P22a, P22b, T28a, T28b) are unavailable, not invented measurements. Negative/sub-resolution/over-range CO readings are excluded from quantitative summaries while source text remains. P22b CO 239 vs report 236 ppm is unresolved; T1/T2 oxygen is questioned by the report. |

Last BASS-II verification before the subsequent teammate pull: 36 backend tests, frontend build/lint passed; all 13 pages and all 2,193 cells checked against source/exports; six findings, eight limitations and eight compact source groups. The later merged repository adds teammate tests/features, so rerun the current suite rather than expecting a fixed test count.

After integrating the teammate changes through d8eef90, all 39 backend tests and the frontend build passed. Lint exited successfully with one non-blocking set-state-in-effect warning in the incoming HomePage.tsx. Dependency versions and the incoming lockfile's platform selectors were preserved.

## Validation commands

Run from the indicated directories:

```bash
# backend/
uv sync --locked
uv run --locked python -m unittest discover -s research -p 'test_*.py'

# frontend/
npm ci
npm run build
npm run lint

# repository root
git diff --check
git status --short --branch
```

Some coding workspaces allow source edits but make .git read-only or restrict network/cache writes. If a Git or dependency operation is blocked, report the actual restriction and provide the exact command for the user. Continue all independent preparation and validation that is available. Never claim a commit or push succeeded without checking the resulting commit and remote state. The user has asked to preserve both their audit work and teammates' changes, then publish them to main with a descriptive commit; do not use ours/theirs wholesale, hard reset, force-push or delete teammates' features.

Start now by inspecting the repository, current Git state and the next investigation I name.