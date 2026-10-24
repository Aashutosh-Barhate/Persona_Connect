# Phase 4 Gate — Backend API (FastAPI)

**Date:** 2026-10-25
**Status:** ✅ SCAFFOLDED & SMOKE-TESTED (v0)

## What was built

New files (backend Phase 4 layer):

| File | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI app, CORS (Vite dev ports), startup seeding, `/healthz` |
| `backend/app/api/routes.py` | All `/api` routers (questionnaire, biographies, assessment lifecycle, recommendations) |
| `backend/app/services/seed_service.py` | Idempotent seeding of IPIP-50 questions + questionnaire + 67 biography profiles |
| `backend/app/services/matching.py` | v0 matching engine (OCEAN trait distance → similarity, explanation builder) |

Run from the project root:

```bash
.venv/bin/uvicorn backend.app.main:app --reload
```

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz` | liveness |
| GET | `/api/questions` | 50 IPIP items |
| GET | `/api/questionnaire` | instrument metadata |
| GET | `/api/biographies?domain=` | filterable list |
| GET | `/api/biographies/{slug}` | detail |
| POST | `/api/assessments` | start (adaptive flag); returns questions + id |
| POST | `/api/assessments/{id}/submit` | complete→full scoring; partial→scores + standard errors; upserts responses + profile rows |
| GET | `/api/assessments/{id}/profile` | stored profile |
| POST | `/api/assessments/{id}/next` | adaptive next-item (uncertainty-first selection) |
| POST | `/api/assessments/{id}/recommendations?top_k=` | v0 euclidean trait matching, `method=euclid_v0`, persists per-item scores + explanations |

## Fixes to pre-existing code required to run

1. `backend/models.py` — `Questionnaire.responses` relationship referenced `UserResponse` with **no
   FK between `questionnaires` and `user_responses`**; mapper configuration failed at first ORM query
   (`NoForeignKeysError`). Relationship removed (responses are linked via `assessment_id`/`question_id`).
   `alembic check` still passes (no schema drift — relationships don't affect DDL).
2. `backend/seed.py` — file was **truncated mid-entry** (Ai Weiwei entry incomplete, list unclosed →
   `SyntaxError`). Entry completed; **67 curated biographies** across 6 domains
   (activism 11, arts 9, business 11, politics 8, science 16, sport 12) now load.
3. `backend/scoring.py` — fragile `from questionnaire import ...`; now falls back between
   `backend.questionnaire` / `questionnaire` depending on `sys.path`.
4. Dependencies: installed runtime deps into `.venv` (fastapi 0.115.6, uvicorn 0.34.0, numpy, scikit-learn).

## Smoke test evidence (live server, 2026-10-25)

- `/healthz` → `{"status": "ok", "version": "0.4.0"}`
- Seeds: **67 biographies**, **50 questions** served
- Lifecycle: start (adaptive) → 11 adaptive next-item calls → partial submit (scores + SEs, `mbti` derived)
  → full 50-item submit → profile persisted → 5 recommendations returned with per-item explanations
- Negative paths: unknown question id → **422**; likert value 9 → **422**

## Known v0 approximations (map to Phases 5–6)

- Matching is trait-distance only; S2–S5 engines, Bayesian posterior confidence and MMR re-ranking
  (implemented in the frontend mock `frontend/src/api/mockApi.ts`) are Phase 6 scope.
- Recommendations key on the `assessment_id` context only; user context (themes/goal/era) exists in the
  frontend mock but not yet in the DB models.
- Adaptive next-item picks by highest SE/fewest-answered trait (information-theoretic IRT selection is
  out of scope for v0).
