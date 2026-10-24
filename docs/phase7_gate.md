# Phase 7 Gate — Frontend ↔ Backend wiring

**Date:** 2026-10-25
**Status:** ✅ WIRED & PARITY-TESTED (v0)

## What was done

### Backend parity routes (contract-matched to `frontend/src/api/mockApi.ts`)

| Method | Path | mockApi parity |
|---|---|---|
| POST | `/api/assessments/{id}/answers` | `answer(sessionId, itemId, value)` — single-item upsert + recomputed adaptive profile (fixes earlier 500 when adaptive stopping fired with <50 answers; completeness now derives from answer count) |
| POST | `/api/assessments/{id}/undo` | `undo(sessionId)` — deletes latest response, returns next state |
| GET  | `/api/assessments/{id}/state` | `resumeQuiz(sessionId)` |
| GET  | `/api/history?user_id=` | `listHistory()` |
| POST | `/api/feedback` | `submitFeedback(...)` — new `feedback` table (migration `0003_feedback`) |

State payload mirrors `NextItemResponse` (`sessionId/item/done/answeredCount/confidence/traitSd`),
with per-trait analytic posterior width `max(7, 12/√n)` (mock formula) and confidence via the
Phase 5 `overallConfidence` mapping.

### Frontend

- `src/api/realApi.ts` — fetch client with the **same function signatures** as `mockApi`
  (startQuiz/answer/undo/getSession/resumeQuiz/getProfile/getMatches/getCachedMatches/
  submitFeedback + `meta`), snake→case-mapping to `src/types.ts`, session bookkeeping kept in
  localStorage exactly like the mock, `sessionId = String(assessment_id)`.
- `src/api/client.ts` — provider switch: `VITE_API_BASE` set → realApi; unset → mockApi
  (pages still run fully offline without the backend).
- Pages re-wired: `mockApi` → `api` from `../api/client` (7 files).
- `vite-env.d.ts` restored for `import.meta.env` typing.

## Verification evidence

- Live integration run (port 8767): single-answer upsert (re-answer keeps count), adaptive loop
  stopping at N_MAX=30 with `item: null` + confidence 84 → undo (29 answered, next item resent)
  → resume (`done:false, answered:29`) → history (`sessionId/themes` rows) → recommendations
  (top match + posterior confidence) → feedback stored; rating 9 → 422; unknown question → 400. ✅
- `tsc -b` clean; vendored esbuild transform OK.

## Environment note

The repo lives on `~/Desktop` (iCloud Desktop sync). While sync churn (fileproviderd, plus an
unrelated long-running `git push` in another repo) was active, synchronous imports and
`vite config` reads stalled on specific files (observed via `sample`: blocked raw `read()` on
`.pyc`/config). A dedicated `/private/var/.../T/opencode/pc_runtime` copy imports the identical
backend in ~1s and was used for the integration test. The frontend production build shows the
same stall from the Desktop path and was verified via `tsc -b` + esbuild; re-run `npm run build`
once the sync storm passes.
