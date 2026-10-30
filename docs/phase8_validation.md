# Phase 8 — Matching-engine validation report

Bios: **67** · synthetic users: **30** (deterministic seed 8888) · weights: S1=0.3 S2=0.15 S3=0.2 S4=0.2 S5=0.15

## 1. Component leverage (Pearson r, component vs. total)

| Engine | mean r | range | interpretation |
|---|---|---|---|
| S1 | 0.216 | [-0.15 .. 0.56] | trait fit (w 0.30) — compressed spread makes leverage modest |
| S2 | 0.238 | [-0.10 .. 0.49] | MBTI proxy — rides the same trait signal as S1 (redundant pair) |
| S3 | 0.813 | [0.66 .. 0.93] | theme overlap (w 0.20) — highest leverage, steers ranking |
| S4 | 0.697 | [0.30 .. 0.96] | challenge/era fit (w 0.20) — strong contextual leverage |
| S5 | 0.703 | [0.50 .. 0.91] | goal-text similarity (w 0.15) — wide spread, modulates well |

Redundancy: mean Pearson r(S1, S2) across users = **0.71** — the MBTI axis proxy is largely a second reading of the same trait distance; keep it weighted low or fold into S1 later.

## 2. Weight sensitivity (Spearman ρ of full ranking vs. planned weights)

| Weight variant | mean ρ | top-5 overlap |
|---|---|---|
| uniform | 0.996 | 97% |
| S1-only | 0.325 | 11% |
| inverse | 0.993 | 97% |

## 3. Score & selection sanity

- Weighted score range across sweep: [0.077 .. 0.539] (mean 0.220); S1 mean 0.126
- Self-match (user == bio traits): mean rank 1.0, max rank 1 → twin always finds itself near the top
- Domains represented in every top-10 (mean distinct): 5.83
- Confidence: tight posterior (sd=7) → 100 · wide posterior (sd=15) → 0
- MMR: 2-per-domain cap + fame-diversity constraint verified in phase8_parity.py

Interpretation: context engines (S3/S4/S5) move the ranking most because theme/challenge
spreads are wide across the corpus; S1+S2 form a stabilising trait backbone with a
compressed score spread at the current weight. S1-only rankings diverge heavily
(rho 0.33, 11% top-5 overlap) - trait similarity alone is far too weak for this corpus.
Next lever: scale S1's spread or its weight if trait fit should dominate, and swap S2
for an embedding-based semantic engine (see Roadmap).
