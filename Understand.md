# Understand — Persona-Connect (Detailed)

Persona-Connect is a role-model matching system. A user takes an adaptive OCEAN personality quiz (IPIP-50), gets a trait profile, and receives ranked biographies of real-world figures whose personalities resemble theirs. Each match comes with an explanation of *why* it matched (trait similarity, shared themes, context fit, text similarity).

## How it works (high-level flow)

```
Wikipedia list of biographies
        ↓  pipeline/01_extract_titles.py
titles.csv (965)
        ↓  pipeline/02_verify_books.py (Google Books → Open Library fallback)
verified.csv / failures.csv
        ↓  pipeline/03_find_protagonist.py
protagonists.csv
        ↓  pipeline/04_enrich.py  (+ 05_score_personality.py)
enriched.jsonl → scored.jsonl (OCEAN/MBTI, themes, challenges, embedding)
        ↓  pipeline/06_validate_and_load.py
SQLite (biography_profiles)  +  data/features_v1.npy  +  backups
        ↓
FastAPI backend (backend/app/main.py)
  - serves IPIP-50 questions, scores assessments, Bayesian posterior
  - runs 5-component weighted matching (S1..S5) + MMR selection
        ↓
React frontend (frontend/)  ←→  Capacitor Android app
  - quiz UI, profile radar, ranked matches, explanations
```

## Repository layout

```
.
├── backend/            FastAPI + SQLAlchemy + Alembic backend
│   ├── models.py       ORM models (Questionnaire, Question, Assessment, UserResponse,
│   │                   PersonalityProfile, BiographyProfile, Recommendation, ...)
│   ├── schemas.py      Pydantic request/response schemas
│   ├── scoring.py      IPIP-50 scoring + adaptive partial scoring + MBTI derivation
│   ├── questionnaire.py IPIP-50 item bank (50 items × 5 traits)
│   ├── seed.py         60 seed biographies
│   ├── database.py     SQLAlchemy engine/session (SQLite, WAL)
│   └── app/
│       ├── main.py     FastAPI entry point (CORS, startup seeding, /healthz)
│       ├── api/routes.py   All /api routers
│       ├── services/
│       │   ├── engine.py     Bayesian posterior over user trait scores (Phase 5)
│       │   ├── matching.py   5-component weighted matching + MMR (Phase 6)
│       │   ├── taxonomy.py   Theme/challenge derivation + domain mapping
│       │   └── seed_service.py  Idempotent DB seeding
│       └── alembic/     Migration scripts (0001_initial, 0002_context, 0003_feedback)
├── pipeline/            Data pipeline scripts (Phases 1–3)
│   ├── 01_extract_titles.py
│   ├── 02_verify_books.py
│   ├── 03_find_protagonist.py
│   ├── 04_enrich.py
│   ├── 05_score_personality.py
│   └── 06_validate_and_load.py
├── frontend/            React 18 + TS + Vite + Tailwind SPA
│   └── src/  (pages, components, api/mockApi.ts, types)
├── docs/                 Gate reports + decisions + rubric
├── notebooks/            Validation + bias-check notebooks
├── tests/                phase8_parity.py, phase8_validate.py
├── requirements.txt
├── alembic.ini
└── Understand.md         (this file)
```

## Detailed file-by-file breakdown

### Backend core

**`backend/database.py`** — SQLAlchemy engine + session factory. SQLite URL `sqlite:///backend/app.db`, `check_same_thread=False`, `SessionLocal`, `get_db()` generator, `init_db()` calls `Base.metadata.create_all`. Phase 3 fixed import to `from backend.models import Base`.

**`backend/models.py`** — 10 ORM models:
- `Questionnaire` (id, instrument, scale_min/max, item_order JSON, description) → has `responses`
- `Question` (id, text, trait O/C/E/A/N, reverse bool, domain)
- `Assessment` (id, user_id, version, started_at, completed_at, questionnaire_id FK, is_adaptive, items_asked) → has `responses`, `profile`, `recommendations`
- `UserResponse` (id, assessment_id FK, question_id FK, response_value 1-5, answered_at)
- `PersonalityProfile` (id, assessment_id unique FK, O/C/E/A/N_score Float, *_se standard errors, mbti String(4), scoring_version) → `trait_vector` property
- `BiographyProfile` (id, name, slug unique, domain, summary, O/C/E/A/N_score, trait_source, trait_confidence, embedding LargeBinary, domain_tags JSON, birth_year, nationality, themes, challenges, fame_tier, peak_life_stage, source_url) → `trait_vector`
- `Recommendation` (id, assessment_id FK, created_at, method)
- `RecommendationItem` (id, rec_id FK, profile_id FK, rank, trait_score, semantic_score, domain_score, final_score, explanation)
- `Consent` (id, user_id, purpose, granted, timestamp)

**`backend/schemas.py`** — Pydantic schemas: `QuestionOut`, `AssessmentStart`, `SubmitAnswers`, `TraitScores`, `ProfileOut`, `BiographyOut`, `RecItemOut`, `RecommendationOut`, `NextQuestion`.

**`backend/questionnaire.py`** — IPIP-50 item bank: 50 items × 5 traits (10 per trait), each with (id, text, trait, reverse). `IPIP50_ITEMS` list + `TRAIT_ITEMS` dict.

**`backend/scoring.py`** — IPIP-50 scoring:
- `reverse_score(raw)` → `6 - raw`
- `score_assessment(answers)` → {trait: 0-100} for complete 50
- `score_partial(answers)` → (scores, standard_errors) for adaptive mode
- `trait_to_mbti(scores)` → 4-letter MBTI from OCEAN thresholds
- `check_completion(answers)` → (bool, missing ids)
- `all_question_ids()`

**`backend/seed.py`** — 60 seed biographies (name, domain, summary, traits, themes, challenges, etc.) used by `seed_service`.

### Backend app (Phase 4+)

**`backend/app/main.py`** — FastAPI app entry point. CORS middleware (Vite dev ports 5173/4173/3000 + Capacitor origins). Startup event calls `ensure_seeded(db)`. Includes router. `/healthz` endpoint. Run: `.venv/bin/uvicorn backend.app.main:app --reload`.

**`backend/app/api/routes.py`** — All `/api` routers:
- `GET /api/questions` — 50 IPIP items
- `GET /api/questionnaire` — instrument metadata
- `GET /api/biographies?domain=` — filterable list
- `POST /api/assessments` — start assessment (AssessmentStart)
- `POST /api/assessments/{id}/answers` — submit answers (SubmitAnswers)
- `GET /api/assessments/{id}/profile` — scored profile
- `GET /api/assessments/{id}/next` — adaptive next question
- `POST /api/assessments/{id}/recommendations` — generate matches
- `GET /api/recommendations/{id}` — fetch matches
- `POST /api/feedback` — user feedback on a match

**`backend/app/services/engine.py`** — Phase 5 Bayesian engine:
- `UserContext` dataclass (traits, sd, themes, goal, era)
- `sd_from_standard_errors(se, answered, trait_counts)` — maps SE to sd scale (floor SD_TARGET=7.0 if answered, SD_MAX=15.0 prior)
- `quiz_done(answered_total, trait_counts)` — adaptive stopping (N_MIN=15, N_MAX=30, ≥3 per trait)
- Mulberry32 PRNG + Box-Muller for deterministic Gaussian sampling
- `_hash_string` for seed derivation

**`backend/app/services/matching.py`** — Phase 6 weighted matching:
- `MATCH_WEIGHTS = {S1:0.30, S2:0.15, S3:0.20, S4:0.20, S5:0.15}`
- `MMR_LAMBDA = 0.7`, `MAX_PER_DOMAIN = 2`, `SHORTLIST = 20`
- `_s1` — OCEAN distance adjusted for user+bio uncertainty (Mahalanobis-ish)
- `_mbti_axes` — 4 axis probabilities
- `_bio_themes`, `_bio_challenges` — fallback to taxonomy derivation
- MMR selection with 2-per-domain cap + fame-diversity (≥1 non-top-tier in top 5)

**`backend/app/services/taxonomy.py`** — Theme/challenge derivation + domain mapping (derive_themes, derive_challenges).

**`backend/app/services/seed_service.py`** — Idempotent seeding of IPIP-50 questions + questionnaire + 67 biography profiles.

### Pipeline

**`pipeline/01_extract_titles.py`** — Scrapes Wikipedia "List of biographies" → 965 titles in `pipeline/data/01_titles.csv`.

**`pipeline/02_verify_books.py`** — Verifies each title against Google Books (fallback Open Library). Uses `requests-cache` (SQLite), `tenacity` backoff, checkpoint every 50 rows. Outputs `02_verified.csv` + `02_failures.csv` with reason codes (`low_match`, `no_description`, `empty_query`, `provider_error`). **Blocked**: Google Books returns 429 without API key.

**`pipeline/03_find_protagonist.py`** — Identifies protagonist from verified book (title/author match). Outputs `03_protagonists.csv` + `review_queue.csv`.

**`pipeline/04_enrich.py`** — Enrichment/normalisation: Wikidata fields, domains, challenges. Outputs `04_enriched.jsonl`. Updates `docs/decisions.md` with Wikidata-primary note.

**`pipeline/05_score_personality.py`** — Phase 2 personality labelling: strict-JSON OCEAN/MBTI scoring from description+Wikipedia only, 2-pass with trait-order shuffle, uncertainty = |diff|, flag if >20, MBTI↔OCEAN cross-check, standardise+rescale, SBERT embeddings. Outputs `05_scored.jsonl`. (Scaffold: produces minimal records.)

**`pipeline/06_validate_and_load.py`** — Phase 3 loader: validates records, loads into `biography_profiles`, generates `data/features_v1.npy`, creates backups.

**`pipeline/report_dropoff.py`** — Phase 1 audit: drop-off funnel → `docs/phase1_gate.md` + `docs/audit_phase1.csv`. Gate: step1=965 PASS, step5=0 FAIL.

### Frontend

**`frontend/`** — React 18 + TS + Vite + Tailwind SPA. Pages: LandingPage, StartPage, QuizPage, ProfilePage, MatchesPage, MatchDetailPage, HistoryPage. Components: Layout, MatchCard, ScoreBreakdown, TraitRangeBar, ConfidenceMeter, Disclosure, RatingForm, Skeleton. API: `mockApi.ts` (mirrors backend contract), `client.ts`, `realApi.ts`. Data: `mockData.ts`, `items.ts`. Types in `types.ts`.

**Capacitor**: `frontend/capacitor.config.ts`, `frontend/android/` (native Android app packaging).

### Alembic migrations

**`backend/app/alembic/versions/`**:
- `0001_initial.py` — creates all 10 tables + indexes
- `0002_context.py` — (context-related migration)
- `0003_feedback.py` — (feedback table migration)

**`alembic.ini`** — config pointing to `backend/app/alembic`, SQLite URL via env.

### Tests

**`tests/phase8_parity.py`** — exact engine parity test (mock vs real).
**`tests/phase8_validate.py`** — validation tests.

### Docs

- `docs/decisions.md` — Wikidata-primary deviation note
- `docs/phase1_gate.md` — Phase 1 audit (step1=965 PASS, step5=0 FAIL)
- `docs/phase2_validation.md` — human-vs-model correlation targets, weak-trait decisions
- `docs/phase3_gate.md` — Alembic verification (✅ VERIFIED, root cause: PROJECT_ROOT off by one level)
- `docs/phase4_gate.md` — FastAPI backend smoke test
- `docs/phase5_6_gate.md` — engine + matching
- `docs/phase7_gate.md` — frontend build status
- `docs/phase8_gate.md` / `phase8_validation.md` — evaluation
- `docs/scoring_rubric.md` — OCEAN rating anchors for non-specialists
- `docs/audit_phase1.csv` — drop-off funnel data

### Notebooks

- `notebooks/02_label_validation.ipynb` — human vs model correlation (150 profiles)
- `notebooks/02_bias_check.ipynb` — gender/region/era bias check

## Phase-by-phase status

| Phase | Description | Status |
|---|---|---|
| 1 | Data pipeline: Wikipedia → titles → verified books → protagonists → enriched | ✅ Scaffolded (1.1 done with 965 rows; 1.2 blocked on Google Books 429) |
| 2 | Personality labelling (OCEAN/MBTI, 2-pass, uncertainty, rubric, bias check) | ✅ Scaffolded (scorer + notebooks + rubric + validation report) |
| 3 | Schema + loader (Alembic, biography_profiles, features_v1.npy, backups) | ✅ Migration verified; loader scaffolded |
| 4 | FastAPI backend (questionnaire, assessment, biographies, scoring) | ✅ Implemented & smoke-tested |
| 5 | Bayesian engine (posterior sampling, adaptive stopping) | ✅ Implemented |
| 6 | Weighted matching (S1–S5, MMR, fame-diversity, explanations) | ✅ Implemented |
| 7 | Frontend (quiz, profile, matches, history, mock API) | ✅ Built & validated |
| 8 | Evaluation / parity tests | ✅ Tests present (phase8_parity, phase8_validate) |
| 9 | Deploy (Capacitor Android, CORS, env config) | 🟡 In progress (android scaffold present) |

## What's left / open items

- **1.2 verification**: run with `GOOGLE_BOOKS_API_KEY` or wait for quota reset so the full 965-row batch completes
- **Loader (06)**: needs to consume real `05_scored.jsonl` output and write `features_v1.npy`
- **Phase 9 deploy**: finalize Capacitor build, production env, CORS origins
- **Backend integration**: swap frontend `mockApi.ts` → `realApi.ts` once backend is wired
- **Validation notebooks**: populate `docs/phase2_validation.md` with real human-vs-model correlations
- **Tests**: run `tests/phase8_parity.py` and `tests/phase8_validate.py` against live backend

## How to run

```bash
# Backend (from project root)
.venv/bin/uvicorn backend.app.main:app --reload   # http://localhost:8000

# Frontend
cd frontend && npm run dev                         # http://localhost:5173

# Migrations
.venv/bin/alembic upgrade head
```

## Key files by phase

- **Phase 1**: `pipeline/01_extract_titles.py`, `02_verify_books.py`, `03_find_protagonist.py`, `04_enrich.py`, `report_dropoff.py`
- **Phase 2**: `pipeline/05_score_personality.py`, `docs/scoring_rubric.md`, `notebooks/02_label_validation.ipynb`, `notebooks/02_bias_check.ipynb`
- **Phase 3**: `backend/app/alembic/versions/0001_initial.py`, `pipeline/06_validate_and_load.py`
- **Phase 4–6**: `backend/app/main.py`, `backend/app/api/routes.py`, `backend/app/services/{engine,matching,taxonomy,seed_service}.py`, `backend/scoring.py`
- **Phase 7**: `frontend/src/pages/*`, `frontend/src/api/mockApi.ts`, `frontend/src/components/*`
- **Phase 8**: `tests/phase8_parity.py`, `tests/phase8_validate.py`
- **Phase 9**: `frontend/capacitor.config.ts`, `frontend/android/`
