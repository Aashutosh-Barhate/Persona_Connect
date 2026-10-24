# Phase 5–6 Gate — Bayesian Engine + Match System

**Date:** 2026-10-25
**Status:** ✅ IMPLEMENTED & INTEGRATION-TESTED (v1)

## What was built

| File | Purpose |
|---|---|
| `backend/app/alembic/versions/0002_context.py` | migration: user context on `assessments` (life_stage, career_phase, themes, goal) + bio enrichment on `biography_profiles` (themes, challenges, fame_tier, peak_life_stage, source_url) |
| `backend/app/services/taxonomy.py` | port of the frontend `mockData.ts` theme/challenge keyword derivation + fame-tier overrides for the 67 curated bios |
| `backend/app/services/engine.py` | **Phase 5:** `UserContext` posterior (point estimates + per-trait sd from stored SEs), 30-draw deterministic posterior sampling, top-5-share confidence, adaptive stopping rules (N_MIN=15 / 3-per-trait / N_MAX=30) |
| `backend/app/services/matching.py` | **Phase 6:** full weighted engine — S1 (0.30) uncertainty-adjusted OCEAN distance, S2 (0.15) MBTI axis agreement, S3 (0.20) theme Jaccard, S4 (0.20) challenge/era fit, S5 (0.15) goal-text token Jaccard — plus MMR re-rank (λ=0.7, trait-cosine diversity, 2-per-domain cap, fame-diversity constraint in top 5) and fact-only explanations |
| `backend/app/api/routes.py` | `/api/meta` added; `/api/assessments` now captures + validates match context (422 on bad theme/life-stage, mirroring the mock client); `/recommendations` upgraded to `weighted_v1`, persists S scores per item, returns the full `MatchOut` contract (breakdown, confidence, confidence_label, explanation) |
| `backend/schemas.py` | `BreakdownItemOut`, `SharedTraitFact`, `DifferenceFact`, `ExplanationOut`, `MatchOut`; `BiographyOut` enriched; `AssessmentStart` gains optional context |

Formulas were **ported 1:1 from `frontend/src/api/mockApi.ts`** (same weights, clamps, PRNG, tokeniser,
stopword list), so mock and real backend produce comparable scores.

## Verification evidence (live integration test, 2026-10-25)

- `/api/meta` → 10 themes, 5 life stages ✅
- Start with context (`life_stage 25-34`, themes `creativity+discovery`, free-text goal) → persisted ✅
- 18 adaptive `next` calls → partial submit (se stored) ✅
- `POST /recommendations`:
  - Top result #1 Ada Lovelace (S3-weighted explanation named the user's two themes) ✅
  - Breakdown per match carried S1–S5 weighted contributions ✅
  - **Confidence** (posterior top-5 share) on every item, High/Medium/Low label ✅
  - **Determinism**: identical recall on repeat call (seeded PRNG) ✅
  - **Domain cap**: max 2 per domain across the list ✅
  - **Fame diversity**: non-top-tier bio in the top 5 ✅
- `alembic check` after 0002 → no drift ✅

## Notes / known approximations

- Confidence floors at 1.0 once every trait has ≥3 answers with sd=7 (same as the mock's formula).
- S5 has no embeddings yet — token Jaccard only; twitterbox scale is fine for 67 bios.
- `mockApi`-parity endpoints (per-answer `answer`/`undo`, history, feedback) are not wired; the mock
  session model lives client-side. Next natural step: real fetch client + `/api/answers` incremental route.
