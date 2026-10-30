# Phase 8 Gate — Evaluation: parity + validation

**Date:** 2026-10-30
**Status:** ✅ PARITY EXACT · VALIDATION REPORTED

## 1. Engine parity vs. the frontend mock (`tests/phase8_parity.py`)

Deterministic harness: 67 bios × 25 seeded synthetic users (FNV-1a/mulberry32
clone of the mock PRNG), comparing every engine component computed by
`backend/app/services/matching.py` against an independent Python port of
`frontend/src/api/mockApi.ts` formulas.

| Check | Result |
|---|---|
| S1 trait-distance (Mahalanobis-style, user sd vs bio 0.12) | max abs err **0.00e+00** |
| S2 MBTI-axis L1 | max abs err **0.00e+00** |
| S3 theme Jaccard | max abs err **0.00e+00** |
| S4 challenge-overlap + era | max abs err **0.00e+00** |
| S5 goal-text token Jaccard | max abs err **0.00e+00** |
| Weighted total (0.30/0.15/0.20/0.20/0.15) | max abs err **0.00e+00** |

**Parity bug found & fixed during evaluation** (this is what Phase 8 was for):

1. `_tokenize` in `matching.py` stripped punctuation *per whitespace token* →
   `self-taught` became token `selftaught`; the mock splits on runs of
   non-alphanumerics (`/[^a-z0-9]+/`) → `self`, `taught`. Rewritten with
   `re.findall(r"[a-z0-9]+")` — after the fix all S5 values are bit-exact.
2. `_s5` normalized theme slugs with `replace("_", " ")` but the canonical
   slugs are hyphenated (`social-impact`). Now `replace("-", " ")]`, matching
   the mock.

Posterior sanity (with a clean negative-distance scorer): nearest bio top-5
share = 1.00 vs 0.03 for the farthest bio; share is deterministic across
repeat draws (seeded Gaussian jitter, N=30).

Selection invariants all pass: 2-per-domain MMR cap, ≥1 non-fame-tier-3 bio in
every top-5, MMR deterministic, and a self-twin user (traits identical to bio
#0) ranks that bio **first**.

## 2. Validation report (`tests/phase8_validate.py` → `docs/phase8_validation.md`)

30 seeded users × 67 bios:

- **Component leverage (Pearson r, component ↔ total):** S1 0.22,
  S2 0.24, S3 0.81, S4 0.70, S5 0.70 — context engines steer the ranking
  because their per-bio spread is wide; S1's spread is compressed
  (mean raw 0.13).
- **Redundancy:** mean r(S1, S2) = **0.71** — the MBTI axis proxy largely
  re-reads trait distance; keep it low-weighted (current 0.15 fine) or fold
  into S1 later.
- **Weight sensitivity (Spearman ρ vs. planned weights):** uniform 0.996 /
  97% top-5 overlap; S1-only 0.325 / **11%** overlap; inverse 0.993 / 97%.
  Context engines are load-bearing: pure trait matching collapses rank
  agreement — validates the multi-engine design.
- **Sanity:** self-match mean rank 1.0 (max 1); top-10 spans mean 5.8
  distinct domains; weighted score range [0.08 .. 0.54] (mean 0.22);
  confidence sd=7 → 100, sd=15 → 0 (mock formula).

## 3. Not carried here

- No human-labeled ground truth exists yet; "validation" is structural
  (leverage, redundancy, stability, invariants) rather than accuracy vs.
  labels. A feedback table now exists (Phase 7); accumulate ratings, then
  re-fit weights against them (Roadmap).
- scikit-learn/numba not needed; everything is pure-Python + re, deterministic.

## 4. Run instructions

```bash
python tests/phase8_parity.py      # exits non-zero on any failure
python tests/phase8_validate.py    # regenerates docs/phase8_validation.md
```

(Executed in the clean runtime copy; the Desktop tree re-runs identical code.)
