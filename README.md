# Persona-Connect

AI-based personality analysis and role-model recommendation system.

A user answers an adaptive Big Five questionnaire; an OCEAN posterior is
estimated **with uncertainty**; the system then matches the user against 67
curated historical/contemporary role-model biographies with a weighted,
explainable scoring pipeline — every match ships with a per-factor breakdown
and a fact-based explanation.

---

## Tech Stack

| Layer  | Tech |
|--------|-------------------|
| Backend    | FastAPI + SQLAlchemy + Alembic + SQLite |
| ML / Engine | Pure-Python math (no heavyweight deps): Gaussian MMR, Jaccard, deterministic seeded sampling |
| Scoring    | IPIP-50 (public-domain, 50 items, reverse-keyed) → OCEAN + MBTI axes |
| Matching   | S1–S5 similarity engines + MMR re-ranking + Bayesian posterior confidence |
| Frontend   | React 18 + TypeScript + Vite + Tailwind CSS |
| Pipeline   | Wikipedia biography pipeline (Python: extraction, verification, audit) |

---

## Project directory map

```
Persona_Connect/
├── backend/               # FastAPI backend + ORM
│   ├── app.db           # SQLite DB (alembic-managed schema)
│   ├── app/alembic/     # migrations (0001_initial, 0002_context, 0003_feedback)
│   ├── app/api/routes.py  # all /api endpoints
│   ├── app/services/    # seed, taxonomy, engine, matching
│   ├── database.py      # engine + session factory
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic request/response contracts
│   ├── scoring.py       # IPIP-50 scoring (full + partial, SEs, MBTI)
│   ├── questionnaire.py # 50 IPIP items (public domain)
│   └── seed.py          # 67 curated biography profiles with OCEAN estimates
├── frontend/              # React app
│   └── src/
│       ├── api/         # mockApi.ts (offline), realApi.ts (fetch), client.ts (switch)
│       ├── pages/       # Start, Quiz, Profile, Matches, MatchDetail, History
│       └── data/        # IPIP items + 55 mirrored mock biographies
├── pipeline/              # Wikipedia → biography data pipeline
│   ├── data/            # outputs (01_titles.csv, et al)
│   └── 0*_*.py          # pipeline steps
├── docs/                  # gate documents per phase
├── notebooks/             # Phase 2 scoring-validation notebooks
└── alembic.ini
```

---

## How the project works — the full flow

```
            ┌───────────────────────────────────────────────────────┐
            │                    USER GENFLOW                        │
            │                                                        │
            │  Start page                                            │
            │    age range    career phase    themes (1↔3)   goal    │
            │                     │                                  │
            │                     ▼                                  │
            │  POST /api/assessments   →  assessment row (validation) │
            │    context persisted: life_stage, career_phase,        │
            │    themes[], goal                                      │
            │                     │                                  │
            │                     ▼                                  │
            │  Adaptive quiz loop (Phase 2+5)                        │
            │    GET next question:  the trait with highest          │
            │    standard-error & fewest answered is sampled         │
            │    user submits answer (1-5 likert)                    │
            │    POST /answers  → upsert, recalc OCEAN points +      │
            │    posterior width (sd = max(7, 12/√n))                │
            │    → until N_MIN=15 & trait≥3 each, or N_MAX=30        │
            │                     │                                  │
            │                     ▼                                  │
            │  Profile (Phase 2-Bayes)                               │
            │    OCEAN 0-100 + per-trait standard errors + MBTI axes │
            │    (E↔I via E, N↔S via O, F↔T via A, J↔P via C)        │
            │                     │                                  │
            │                     ▼                                  │
            │  Match engines (Phase 6) per biography:                │
            │   S1 0.30  OCEAN distance adjusted by user sd + bio     │
            │            uncertainty (Mahalanobis-style)             │
            │   S2 0.15  MBTI axis agreement (probabilities)         │
            │   S3 0.20  shared themes (Jaccard)                     │
            │   S4 0.20  challenges overlap + era/fit                │
            │   S5 0.15  goal-text token Jaccard vs bio story        │
            │                     │                                  │
            │                     ▼                                  │
            │  Bayesian confidence (Phase 5)                         │
            │    30 draws × jittered user traits → count             │
            │    bio appearance in top-5 → share = confidence        │
            │                     │                                  │
            │                     ▼                                  │
            │  MMR re-rank (Phase 6)                                 │
            │    λ=0.7 relevance↔diversity, 2-per-domain cap,        │
            │    fame-diversity: ≥1 non-famous bio in top 5          │
            │                     │                                  │
            │                     ▼                                  │
            │  Match pages — ranked, annotated, confidence scored    │
            │    every match: 5-term breakdown + explanation built   │
            │    ONLY from structured facts (shared traits with      │
            │    "high/low" agreement, shared domains, biggest       │
            │    divergence)                                         │
            │                     │                                  │
            │                     ▼                                  │
            │  User feedback (rating 1-5 + comment) — POST /feedback │
            └───────────────────────────────────────────────────────┘
```

### Non-interactive flow

Without the quiz, the same engines run against a biography with manually curated
OCEAN estimates (seeded from `backend/seed.py` — 67 bios across science, politics,
arts, business, sport, activism) and derived facets (`themes`, `challenges`,
`fame_tier`, `peak_life_stage`) auto-extracted from summary text by keyword taxonomy.

### Data flow summary

1. **IPIP-50 items** live in `backend/questionnaire.py` (1-5 Likert, some reverse).
2. Each answer → stored as `user_responses` row; scoring recomputes
   `personality_profiles` (OCEAN 0–100 + standard errors) and updates `assessments`.
3. User context reached at start (themes, goal, life stage, career phase) is
   persisted on the `assessments` row (migration 0002).
4. Biographies + facets are persisted at seed time and enriched live from text
   if rows predate the enrichment.
5. Matching runs entirely server-side; results (S-scores, explanations) are
   also persisted to `recommendation_items` for auditability.

---

## Running the project

### Backend

```bash
# from the repo root
.venv/bin/uvicorn backend.app.main:app --reload
# → http://127.0.0.1:8000, docs at /docs
```

Database migrations (fresh machine):

```bash
.venv/bin/alembic upgrade head
```

Schema+seed is applied automatically at startup (`ensure_seeded`), so if the app
already runs, both are done.

### Frontend

```bash
cd frontend
npm install
# mock mode (default, no server needed):
npm run dev
# server mode: add VITE_API_BASE and restart
echo 'VITE_API_BASE=http://127.0.0.1:8000' > .env.local
npm run dev
```

The client switches between `mockApi` (browser localStorage) and `realApi`
(backend fetch) based on `VITE_API_BASE` presence, so development can continue
with zero backend.

### Sanity ping

```bash
curl http://127.0.0.1:8000/healthz
```

---

## API endpoints (current)

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/healthz` | liveness + version |
| GET  | `/api/meta` | themes, life stages, career phases, challenge labels |
| GET  | `/api/questions` | 50 IPIP items |
| GET  | `/api/questionnaire` | instrument metadata + item order |
| GET  | `/api/biographies?domain=` | role-model list (filter by domain) |
| GET  | `/api/biographies/{slug}` | one biography, enriched |
| POST | `/api/assessments` | start quiz (user validation; nullable context) |
| POST | `/api/assessments/{id}/submit` | batch submit (full or partial) → `ProfileOut` |
| GET  | `/api/assessments/{id}/profile` | stored profile |
| POST | `/api/assessments/{id}/next` | adaptive next item |
| POST | `/api/assessments/{id}/recommendations` | full match list (weighted_v1) |
| GET  | `/api/history?user_id=` | past assessments for a user |

---

## Data / work pipeline (offline)

`pipeline/` builds the biography corpus from Wikipedia:

1. `01_fetch_titles.py` → 965 candidate titles (`data/01_titles.csv`) ✅
2. `02_verify_books.py` → verifies bios (Open Library fallback) — scaffolded ⚠️
3. `03_find_protagonist.py` → subject identification ⚠️
4. `04_enrich.py` → enrichment ⚠️
5. Phase-1 audit gate (`docs/audit_phase1.csv`) ✅

---

## Work completed in this cycle

| Phase | What was done | Status |
|-------|---------------|--------|
| 1 | Wikipedia title pipeline, lists+audit done; remaining steps scaffolded | partial ✅ |
| 2 | Scoring rubric, notebooks, validation report (`docs/scoring_rubric.md`, `docs/phase2_validation.md`) | ✅ |
| 3 | Alembic schema + migrations **fixed & verified** (PROJECT_ROOT path bug → `backend/backend/` phantom dir; `upgrade`/`downgrade` round trip + `alembic check` clean) | ✅ |
| 4 | **FastAPI backend stood up**: main.py, /api routes, idempotent seeding, v0 trait matching; fixed broken `Questionnaire.responses` relationship (NoForeignKeys crash) and repaired the truncated seed.py (67 bios now load); smoke-tested end-to-end incl. error paths | ✅ |
| 5 | **Bayesian engine**: per-trait posterior sd from stored SEs, deterministic 30-draw posterior sampling, top-5-share confidence, adaptive stopping rules | ✅ |
| 6 | **Matching**: S1–S5 weighted engines ported 1:1 from mock, MMR re-ranking with domain cap + fame diversity, fact-only explanations; `/recommendations` upgraded to `weighted_v1`; migration 0002 (assessment context + bio facets); taxonomy port; hooks into start/submit/recommend | ✅ |
| 7 | **Frontend↔backend wiring**: per-item answer/undo, resume, history, feedback backend parity routes (+ migration 0003_feedback); realApi fetch client mirroring mockApi's exact signatures; `VITE_API_BASE` behaviour switch in `client.ts`; pages re-wired; mock mode stays default | ✅ |
| 8 | Evaluation of engines (correlate weighted_v1 vs mock outputs; hold-out weighting experiments) | ⏳ next |
| 9 | Deploy (production CORS origins, persistent host, vector/embedding roadmap) | ⏳ planned |

---

## Design decisions

- **SQLite** is deliberate for the demo/prototype scale; models avoid engine-specific
  types (only `JSON`/`LargeBinary`); a Postgres forward port is mechanical.
- **Match contracts copied from the mock.** `frontend/src/types.ts` matches
  `backend/schemas.py` field-for-field (mapped snake_case→camelCase in the client),
  so the pages never need to change when the backend goes live.
- **Explanations are framed only from structured facts** (measured trait
  agreement, shared themes) — deliberately no free-text generation, to keep the
  recommendation output auditable.
- **Privacy posture:** results store only a bare `user_id` string and assessment
  metadata — no emails, names, or other PII; feedback links by assessment id.

## Roadmap

- [ ] Embeddings for S5 (sentence-transformer) replacing token Jaccard
- [ ] IRT-style adaptive item selection (replace trait-uncertainty heuristic)
- [ ] Real per-bio uncertainty propagation into S1 (use trait_confidence)
- [ ] Feedback loop into match weights (rating-weighted re-ranking)
- [ ] CI: pytest for scoring + engine parity vs. mock formulas
- [ ] Phase 9 deployment (production CORS, persistent host, vector/embedding roadmap)

## Project history

See `docs/decisions.md` for the decision log, `docs/phase*_gate.md` for
per-phase gate documents, and `docs/phase2_validation.md` for rubric validation.
