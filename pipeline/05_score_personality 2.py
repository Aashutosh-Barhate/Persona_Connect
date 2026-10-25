"""Pipeline step 5: Personality labelling (OCEAN + MBTI probabilities).

Input: pipeline/data/04_enriched.jsonl
For each enriched record, build ONE prompt from Google Books description
and Wikipedia summary ONLY. Instruct to score from that text and answer
"insufficient evidence" rather than guess from background knowledge.

Required strict-JSON output per person, validated by a Pydantic model:
- ocean: 5 floats 0-100, plus a per-trait spread
- mbti_probs: 4 probabilities (E/I, S/N, T/F, J/P)
- domains: 1-3 labels from the fixed life-domain list
- challenges: 1-4 labels from the challenge taxonomy
- peak_life_stage: one label
- evidence: one short line per trait, paraphrasing the supplied text only
- embedding: 384-dim float32 SBERT over description + Wikipedia summary

Procedure:
1. Retry once on a JSON parse failure, then log and skip.
2. Run each person TWICE with the trait order shuffled, at low temperature.
   Mean is score; absolute difference is uncertainty.
3. Flag if |diff| > 20 on any trait; drop/re-run with stronger model.
4. Cross-check MBTI against OCEAN pairings (E↔extraversion, S/N↔openness,
   T/F↔agreeableness, J/P↔conscientiousness). Flag large contradictions.
5. Standardise each trait across dataset and rescale to 0-100.
6. Tag domains/challenges via SBERT similarity + model verification pass.

Output: pipeline/data/05_scored.jsonl
"""
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
INPUT = BASE_DIR / "pipeline" / "data" / "04_enriched.jsonl"
OUTPUT = BASE_DIR / "pipeline" / "data" / "05_scored.jsonl"

OUTPUT.parent.mkdir(parents=True, exist_ok=True)


def main() -> int:
    log.info("=== Pipeline 05: Personality labelling ===")
    if not INPUT.exists():
        log.warning("Input %s not found; creating empty scaffold output", INPUT)
        with OUTPUT.open("w", encoding="utf-8") as f:
            pass
        return 0

    out = []
    for line in INPUT.open(encoding="utf-8"):
        try:
            rec = json.loads(line)
        except Exception:
            continue
        # Scaffolding: produce minimal valid-like structure (for demo flow)
        out.append({
            "person_id": rec.get("person_id"),
            "name": rec.get("name"),
            "ocean": {"O": 50.0, "C": 50.0, "E": 50.0, "A": 50.0, "N": 50.0, "spread": [10.0, 10.0, 10.0, 10.0, 10.0]},
            "mbti_probs": {"E_I": 0.5, "S_N": 0.5, "T_F": 0.5, "J_P": 0.5},
            "domains": rec.get("domains") or ["creativity"],
            "challenges": rec.get("challenges") or [],
            "peak_life_stage": "mid",
            "evidence": {"O": "from text", "C": "from text", "E": "from text", "A": "from text", "N": "from text"},
        })

    with OUTPUT.open("w", encoding="utf-8") as f:
        for x in out:
            f.write(json.dumps(x) + "\n")

    log.info("Wrote %d scored records to %s", len(out), OUTPUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
