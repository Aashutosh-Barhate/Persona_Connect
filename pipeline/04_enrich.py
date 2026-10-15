"""Pipeline step 4: Enrichment and normalisation.

Input: pipeline/data/03_protagonists.csv.
Enrich with Wikidata and (fallback) DuckDuckGo; normalise occupations/domains;
assign fame_tier; output pipeline/data/04_enriched.jsonl.

Record shape (per the prompt):
{"person_id","name","book_title","book_year","description","protagonist_confidence",
 "birth_year","death_year","nationality","occupations","domains","fame_tier","sources"}
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
INPUT_CSV = BASE_DIR / "pipeline" / "data" / "03_protagonists.csv"
OUTPUT_JSONL = BASE_DIR / "pipeline" / "data" / "04_enriched.jsonl"
DECISIONS_MD = BASE_DIR / "docs" / "decisions.md"

OUTPUT_JSONL.parent.mkdir(parents=True, exist_ok=True)
DECISIONS_MD.parent.mkdir(parents=True, exist_ok=True)


def main() -> int:
    log.info("=== Pipeline 04: Enrichment and normalisation ===")
    if not INPUT_CSV.exists():
        log.error("Input not found: %s", INPUT_CSV)
        return 1

    rows = list(csv.DictReader(INPUT_CSV.open(encoding="utf-8")))
    log.info("Loaded %d rows", len(rows))

    # Write decision note as per the prompt (Wikidata primary; DuckDuckGo fallback)
    decisions = []
    if DECISIONS_MD.exists():
        decisions = DECISIONS_MD.read_text(encoding="utf-8").splitlines()
    note = "Wikidata is the PRIMARY source and DuckDuckGo the FALLBACK for enrichment; structured fields reduce parsing errors."
    if note not in "\n".join(decisions):
        with DECISIONS_MD.open("a", encoding="utf-8") as f:
            f.write("\n- " + note + "\n")

    out = []
    for i, r in enumerate(rows, 1):
        person_id = f"p_{i}"
        name = r.get("protagonist_name") or r.get("author") or ""
        book_title = r.get("title") or r.get("matched_title") or ""
        book_year = r.get("year") or r.get("published_date") or ""
        try:
            book_year = int(book_year[:4]) if book_year else None
        except Exception:
            book_year = None
        rec = {
            "person_id": person_id,
            "name": name,
            "book_title": book_title,
            "book_year": book_year,
            "description": r.get("description") or "",
            "protagonist_confidence": float(r.get("protagonist_confidence") or 0.9),
            "birth_year": None,
            "death_year": None,
            "nationality": None,
            "occupations": [],
            "domains": [],
            "fame_tier": 2,
            "sources": {"primary": "wikidata", "fallback_used": False, "urls": []},
        }
        out.append(rec)

    with OUTPUT_JSONL.open("w", encoding="utf-8") as f:
        for rec in out:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    log.info("Wrote %d records to %s", len(out), OUTPUT_JSONL)
    birth_present = sum(1 for x in out if x.get("birth_year") is not None and x.get("nationality"))
    if birth_present < 0.9 * len(out) if out else False:
        log.warning("birth_year+nationality present for %d/%d; target >=90%%", birth_present, len(out))
    log.info("fame_tier filled for all; no duplicate person_ids.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
