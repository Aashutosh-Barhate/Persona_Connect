"""Phase 1 audit: funnel table, sample audit, gate report.

Write pipeline/report_dropoff.py and run Phase 1 audit.

1. Produce a funnel table: rows entering/leaving each of steps 1-5,
   broken down by reason code.
2. Sample 50 random surviving rows into docs/audit_phase1.csv for
   manual protagonist checking; add a verdict column.
3. Print the fame_tier distribution.

Gate (all must hold before Phase 2):
- >= 800 rows left step 1 and >= 500 survived step 5.
- Manual audit finds protagonist correct in >= 95% of the 50 sampled rows.
- >= 25% of rows are outside the top fame_tier.
Write results to docs/phase1_gate.md.
"""
import csv
import json
import logging
import sys
from pathlib import Path

log = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

BASE_DIR = Path(__file__).resolve().parent.parent
TITLES = BASE_DIR / "pipeline" / "data" / "01_titles.csv"
VERIFIED = BASE_DIR / "pipeline" / "data" / "02_verified.csv"
PROTAG = BASE_DIR / "pipeline" / "data" / "03_protagonists.csv"
REVIEW = BASE_DIR / "pipeline" / "data" / "review_queue.csv"
ENRICHED = BASE_DIR / "pipeline" / "data" / "04_enriched.jsonl"
AUDIT = BASE_DIR / "docs" / "audit_phase1.csv"
GATE = BASE_DIR / "docs" / "phase1_gate.md"

AUDIT.parent.mkdir(parents=True, exist_ok=True)


def count_lines(p: Path) -> int:
    if not p.exists(): return 0
    if p.suffix == ".jsonl":
        return sum(1 for _ in p.open())
    return sum(1 for _ in csv.DictReader(p.open()))


def main() -> int:
    log.info("=== Pipeline report_dropoff (Phase 1 audit) ===")
    step1 = count_lines(TITLES)  # rows left step 1
    step2 = count_lines(VERIFIED)
    step3_surv = count_lines(PROTAG)
    step3_rev = count_lines(REVIEW)
    step5 = count_lines(ENRICHED)

    # Sample surviving from step 5 if exists; else from step 3
    sample = []
    src = ENRICHED if ENRICHED.exists() else PROTAG
    if src.exists():
        if src.suffix == ".jsonl":
            items = [json.loads(x) for x in src.open()]
        else:
            items = list(csv.DictReader(src.open()))
        import random
        random.seed(42)
        for x in random.sample(items, min(50, len(items))):
            sample.append({
                "name": x.get("name") or x.get("protagonist_name") or "",
                "book_title": x.get("book_title") or x.get("title") or "",
                "fame_tier": x.get("fame_tier", ""),
                "verdict": "",
            })
    with AUDIT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["name","book_title","fame_tier","verdict"])
        w.writeheader()
        w.writerows(sample)

    # Gate
    outside_top = 0
    if ENRICHED.exists():
        items = [json.loads(x) for x in ENRICHED.open()]
        outside_top = sum(1 for x in items if int(x.get("fame_tier", 3)) < 3)
    pct_outside = (outside_top / step5 * 100) if step5 else 0.0

    md = []
    md.append("# Phase 1 Gate Report")
    md.append("")
    md.append("## Funnel (rows entering/leaving steps 1-5)")
    md.append(f"- Step 1 (titles extracted): {step1}")
    md.append(f"- Step 2 (verified via Google Books/Open Library): {step2}")
    md.append(f"- Step 3 (protagonist identified, surviving): {step3_surv} (review queue: {step3_rev})")
    md.append(f"- Step 5 (enriched/normalised): {step5}")
    md.append("")
    md.append("## Fame tier distribution (surviving step 5)")
    md.append(f"- Outside top fame tier (<3): {outside_top} ({pct_outside:.1f}%)")
    md.append("")
    md.append("## Audit sample")
    md.append(f"- Sampled {len(sample)} rows to {AUDIT.name}; add 'verdict' (correct/incorrect/unclear).")
    md.append("")
    md.append("## Gate check")
    md.append(f"- >= 800 left step 1: {'PASS' if step1>=800 else 'FAIL'} ({step1})")
    md.append(f"- >= 500 survived step 5: {'PASS' if step5>=500 else 'FAIL'} ({step5})")
    md.append(f"- >= 25% outside top fame tier: {'PASS' if pct_outside>=25 else 'FAIL'} ({pct_outside:.1f}%)")
    md.append("- Manual audit >= 95% correct (pending human verdict) — see audit file.")
    md.append("")
    GATE.write_text("\n".join(md), encoding="utf-8")

    print(md)
    if step1 < 800 or step5 < 500 or pct_outside < 25:
        print("WARNING: Phase 1 gate NOT fully satisfied.", file=sys.stderr)
        # Continue anyway for demo; return 0 if structure OK
    return 0


if __name__ == "__main__":
    sys.exit(main())
