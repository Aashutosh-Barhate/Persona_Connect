# Phase 2 Validation Report

## Overview
Human vs model correlation targets and decisions about weak traits. This report is populated after running notebooks/02_label_validation.ipynb and notebooks/02_bias_check.ipynb.

## Per-trait human vs model correlation (target ~0.5)
| Trait | Human-model correlation (r) | Target (~0.5) | Status | Action (if weak) |
|---|---|---|---|---|
| Openness (O) | — | ~0.5 | pending | — |
| Conscientiousness (C) | — | ~0.5 | pending | — |
| Extraversion (E) | — | ~0.5 | pending | — |
| Agreeableness (A) | — | ~0.5 | pending | — |
| Neuroticism (N) | — | ~0.5 | pending | — |

## Inter-rater agreement
- Raters: 2 independent
- Sample: 150 profiles
- Agreement (e.g. ICC/Cohen’s kappa or Pearson): pending
- Notes: text-based scoring is noisy; ~0.5/trait is treated as reasonable for this project.

## Trait spread (across dataset)
- Standard deviation per trait: pending (must be >= 10 points after standardisation/rescaling)

## Unstable flags
- Rows flagged unstable (|diff|>20 between 2 runs): pending (target <= 5%)

## Bias check (gender/region/era)
- Gaps detected: pending
- Prompt adjustments made: pending (if gaps large)
- Findings: pending

## Weak traits & weight/display decisions
- Traits below bar: pending
- Display in UI: show as ranges (bands) for weak traits; reduce matching weight accordingly
- Config changes recorded: pending

This file is a scaffold; populate from notebook outputs before freezing Phase 2.
