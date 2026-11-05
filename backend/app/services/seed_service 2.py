"""Seeding logic: load IPIP-50 questions and the curated biography set into the DB."""
import json
from datetime import datetime

from sqlalchemy.orm import Session

try:
    from backend.models import Question, Questionnaire, BiographyProfile
    from backend.questionnaire import IPIP50_ITEMS
    from backend.seed import BIographies as BIOGRAPHIES
    from backend.app.services import taxonomy
except ImportError:
    from models import Question, Questionnaire, BiographyProfile
    from questionnaire import IPIP50_ITEMS
    from seed import BIographies as BIOGRAPHIES
    from app.services import taxonomy


def seed_questions(db: Session) -> int:
    """Insert IPIP-50 questions (and the IPIP-50 questionnaire row) if empty. Returns count."""
    if db.query(Question).count() == 0:
        db.add_all(
            Question(
                id=qid,
                text=text,
                trait=trait,
                reverse=bool(reverse),
                domain=None,
            )
            for qid, text, trait, reverse in IPIP50_ITEMS
        )
    if db.query(Questionnaire).count() == 0:
        db.add(
            Questionnaire(
                instrument="IPIP-50",
                scale_min=1,
                scale_max=5,
                item_order=json.dumps([qid for qid, _, _, _ in IPIP50_ITEMS]),
                description="50-item Big Five inventory (public domain IPIP), "
                "reverse-keyed items marked; items presented in randomized order.",
            )
        )
    db.commit()
    return db.query(Question).count()


def seed_biographies(db: Session) -> int:
    """Insert curated biography profiles if the table is empty. Returns count."""
    if db.query(BiographyProfile).count() > 0:
        return db.query(BiographyProfile).count()

    for bio in BIOGRAPHIES:
        tags = bio.get("domain_tags", [])
        summary = bio["summary"]
        name = bio["name"]
        fame, peak = taxonomy.FAME_OVERRIDES.get(name, (2, "mid"))
        db.add(
            BiographyProfile(
                name=name,
                slug=bio["slug"],
                domain=bio["domain"],
                summary=summary,
                O_score=bio["O"],
                C_score=bio["C"],
                E_score=bio["E"],
                A_score=bio["A"],
                N_score=bio["N"],
                trait_source=bio.get("trait_source", "manual"),
                trait_confidence=bio.get("trait_confidence", 1.0),
                domain_tags=tags,
                birth_year=bio.get("birth_year"),
                nationality=bio.get("nationality"),
                themes=taxonomy.derive_themes(summary, tags),
                challenges=taxonomy.derive_challenges(summary, tags),
                fame_tier=fame,
                peak_life_stage=peak,
                source_url=taxonomy.wikipedia_url(name),
            )
        )
    db.commit()
    return db.query(BiographyProfile).count()


def ensure_seeded(db: Session) -> dict:
    """Idempotent seed entrypoint used at app startup."""
    n_q = seed_questions(db)
    n_b = seed_biographies(db)
    return {"questions": n_q, "biographies": n_b}
