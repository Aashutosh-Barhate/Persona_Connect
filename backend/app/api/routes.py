"""Persona-Connect API routes (Phase 4).

Contract mirrors backend/schemas.py and the frontend mock API layer
(frontend/src/api/mockApi.ts), so the real client can swap in later.
"""
import json
import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

try:
    from backend.database import get_db
    from backend.models import (
        Assessment, BiographyProfile, PersonalityProfile, Question,
        Questionnaire, Recommendation, RecommendationItem, UserResponse,
    )
    from backend.schemas import (
        AssessmentStart, BiographyOut, NextQuestion, ProfileOut,
        QuestionOut, RecItemOut, RecommendationOut, SubmitAnswers, TraitScores,
    )
    from backend import scoring
    from backend.app.services.matching import rank_biographies
    from backend.app.services.seed_service import ensure_seeded
except ImportError:
    from database import get_db
    from models import (
        Assessment, BiographyProfile, PersonalityProfile, Question,
        Questionnaire, Recommendation, RecommendationItem, UserResponse,
    )
    from schemas import (
        AssessmentStart, BiographyOut, NextQuestion, ProfileOut,
        QuestionOut, RecItemOut, RecommendationOut, SubmitAnswers, TraitScores,
    )
    import scoring
    from app.services.matching import rank_biographies
    from app.services.seed_service import ensure_seeded

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _traits_dict(profile: PersonalityProfile) -> TraitScores:
    return TraitScores(
        O=profile.O_score, C=profile.C_score, E=profile.E_score,
        A=profile.A_score, N=profile.N_score,
    )


def _profile_out(db: Session, assessment: Assessment) -> ProfileOut:
    profile = db.query(PersonalityProfile).filter(
        PersonalityProfile.assessment_id == assessment.id
    ).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="No profile scored for this assessment yet.")
    return ProfileOut(
        assessment_id=assessment.id,
        traits=_traits_dict(profile),
        standard_errors={"O": profile.O_se, "C": profile.C_se, "E": profile.E_se,
                          "A": profile.A_se, "N": profile.N_se},
        mbti=profile.mbti,
        items_asked=assessment.items_asked or 0,
        is_adaptive=bool(assessment.is_adaptive),
    )


def _get_assessment(db: Session, assessment_id: int) -> Assessment:
    assessment = db.get(Assessment, assessment_id)
    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    return assessment


def _bio_out(bio: BiographyProfile) -> BiographyOut:
    return BiographyOut(
        id=bio.id,
        name=bio.name,
        domain=bio.domain or "",
        summary=bio.summary or "",
        traits=TraitScores(
            O=bio.O_score or 50.0, C=bio.C_score or 50.0, E=bio.E_score or 50.0,
            A=bio.A_score or 50.0, N=bio.N_score or 50.0,
        ),
        trait_source=bio.trait_source or "manual",
        trait_confidence=bio.trait_confidence or 1.0,
        domain_tags=bio.domain_tags or [],
        birth_year=bio.birth_year,
        nationality=bio.nationality,
    )


def _answers_map(answers: dict) -> dict:
    """Coerce {question_id: value} into {int: int} with validation."""
    try:
        cleaned = {int(qid): int(val) for qid, val in answers.items()}
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid answer payload: {exc}")
    for qid, val in cleaned.items():
        if val < 1 or val > 5:
            raise HTTPException(
                status_code=422,
                detail=f"Response for question {qid} must be an integer 1-5 (got {val}).",
            )
    return cleaned


def _store_responses(db: Session, assessment_id: int, answers: dict) -> int:
    """Upsert user_responses for the given answers. Returns number stored."""
    stored = 0
    existing = {
        r.question_id: r
        for r in db.query(UserResponse).filter(UserResponse.assessment_id == assessment_id)
    }
    for qid, value in answers.items():
        row = existing.get(qid)
        if row:
            row.response_value = value
        else:
            db.add(
                UserResponse(
                    assessment_id=assessment_id,
                    question_id=qid,
                    response_value=value,
                )
            )
        stored += 1
    db.commit()
    return stored


def _answers_from_db(db: Session, assessment_id: int) -> dict:
    rows = db.query(UserResponse).filter(UserResponse.assessment_id == assessment_id)
    return {r.question_id: r.response_value for r in rows}


# ---------------------------------------------------------------------------
# Meta / catalogue
# ---------------------------------------------------------------------------

@router.get("/questions", response_model=list[QuestionOut])
def list_questions(db: Session = Depends(get_db)):
    return db.query(Question).order_by(Question.id).all()


@router.get("/questionnaire")
def get_questionnaire(db: Session = Depends(get_db)):
    q = db.query(Questionnaire).first()
    if q is None:
        raise HTTPException(status_code=404, detail="No questionnaire configured.")
    return {
        "id": q.id,
        "instrument": q.instrument,
        "scale_min": q.scale_min,
        "scale_max": q.scale_max,
        "item_order": json.loads(q.item_order) if q.item_order else None,
        "description": q.description,
    }


@router.get("/biographies", response_model=list[BiographyOut])
def list_biographies(
    domain: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(BiographyProfile)
    if domain:
        query = query.filter(BiographyProfile.domain == domain)
    return [_bio_out(b) for b in query.order_by(BiographyProfile.name).all()]


@router.get("/biographies/{slug}", response_model=BiographyOut)
def get_biography(slug: str, db: Session = Depends(get_db)):
    bio = db.query(BiographyProfile).filter(BiographyProfile.slug == slug).first()
    if bio is None:
        raise HTTPException(status_code=404, detail="Biography not found.")
    return _bio_out(bio)


# ---------------------------------------------------------------------------
# Assessment lifecycle
# ---------------------------------------------------------------------------

@router.post("/assessments")
def start_assessment(payload: AssessmentStart, db: Session = Depends(get_db)):
    ensure_seeded(db)  # idempotent
    assessment = Assessment(
        user_id=payload.user_id,
        version=payload.version,
        is_adaptive=payload.adaptive,
        items_asked=0,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    questions = db.query(Question).order_by(Question.id).all()
    return {
        "assessment_id": assessment.id,
        "version": assessment.version,
        "is_adaptive": assessment.is_adaptive,
        "questions": [
            QuestionOut(id=q.id, text=q.text, trait=q.trait, reverse=bool(q.reverse))
            for q in questions
        ],
    }


@router.post("/assessments/{assessment_id}/submit", response_model=ProfileOut)
def submit_answers(assessment_id: int, payload: SubmitAnswers, db: Session = Depends(get_db)):
    assessment = _get_assessment(db, assessment_id)
    answers = _answers_map(payload.answers)

    valid_ids = {q.id for q in db.query(Question.id)}
    unknown = set(answers) - valid_ids
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown question ids: {sorted(unknown)}")

    _store_responses(db, assessment_id, answers)

    if payload.complete:
        missing = {q.id for q in db.query(Question.id)} - set(answers)
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"Assessment incomplete; missing questions: {sorted(missing)}",
            )
        scores = scoring.score_assessment(answers)
        ses = {t: 0.0 for t in scores}
    else:
        scores, ses = scoring.score_partial(answers)

    profile = db.query(PersonalityProfile).filter(
        PersonalityProfile.assessment_id == assessment_id
    ).first()
    if profile is None:
        profile = PersonalityProfile(assessment_id=assessment_id)
        db.add(profile)
    profile.O_score, profile.C_score, profile.E_score = scores["O"], scores["C"], scores["E"]
    profile.A_score, profile.N_score = scores["A"], scores["N"]
    profile.O_se, profile.C_se, profile.E_se = ses["O"], ses["C"], ses["E"]
    profile.A_se, profile.N_se = ses["A"], ses["N"]
    profile.mbti = scoring.trait_to_mbti(scores)
    profile.scoring_version = "1.0"

    assessment.completed_at = assessment.completed_at or datetime.utcnow()
    assessment.items_asked = len(answers)
    db.commit()
    db.refresh(assessment)
    return _profile_out(db, assessment)


@router.get("/assessments/{assessment_id}/profile", response_model=ProfileOut)
def get_profile(assessment_id: int, db: Session = Depends(get_db)):
    assessment = _get_assessment(db, assessment_id)
    return _profile_out(db, assessment)


@router.post("/assessments/{assessment_id}/next", response_model=NextQuestion)
def next_question(
    assessment_id: int,
    db: Session = Depends(get_db),
):
    """Adaptive next item: return the lowest-information item (most-answered trait first)."""
    assessment = _get_assessment(db, assessment_id)
    answers = _answers_from_db(db, assessment_id)
    asked_ids = set(answers)

    all_questions = db.query(Question).order_by(Question.id).all()
    remaining = [q for q in all_questions if q.id not in asked_ids]
    if not remaining:
        raise HTTPException(status_code=409, detail="Assessment complete; no items remaining.")

    if not assessment.is_adaptive or not asked_ids:
        nxt = remaining[0]
    else:
        scores, ses = scoring.score_partial(answers)
        # highest uncertainty trait first, fewest answered as tie-break
        trait_order = sorted(ses, key=lambda t: (-ses[t], sum(
            1 for q in all_questions if q.trait == t and q.id in asked_ids)))
        for trait in trait_order:
            nxt = next((q for q in remaining if q.trait == trait), None)
            if nxt:
                break

    return NextQuestion(
        assessment_id=assessment_id,
        question=QuestionOut(
            id=nxt.id, text=nxt.text, trait=nxt.trait, reverse=bool(nxt.reverse)
        ),
        items_asked=len(asked_ids),
        estimated_remaining=len(remaining) - 1,
    )


@router.post("/assessments/{assessment_id}/recommendations", response_model=RecommendationOut)
def recommend(
    assessment_id: int,
    top_k: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Rank biographies against the scored profile (v0 trait-distance engine)."""
    assessment = _get_assessment(db, assessment_id)
    profile = db.query(PersonalityProfile).filter(
        PersonalityProfile.assessment_id == assessment_id
    ).first()
    if profile is None:
        raise HTTPException(status_code=409, detail="Score the assessment before requesting matches.")

    user_traits = {t: getattr(profile, f"{t}_score") or 50.0 for t in ("O", "C", "E", "A", "N")}
    biographies = db.query(BiographyProfile).all()
    ranked = rank_biographies(user_traits, biographies, top_k=top_k)

    rec = Recommendation(assessment_id=assessment.id, method="euclid_v0")
    db.add(rec)
    db.flush()

    items = []
    for rank, (bio, scores) in enumerate(ranked, start=1):
        item = RecommendationItem(
            rec_id=rec.id,
            profile_id=bio.id,
            rank=rank,
            trait_score=scores["trait_score"],
            semantic_score=scores["semantic_score"],
            domain_score=scores["domain_score"],
            final_score=scores["final_score"],
            explanation=scores["explanation"],
        )
        db.add(item)
        items.append(
            RecItemOut(
                rank=rank,
                biography=_bio_out(bio),
                trait_score=scores["trait_score"],
                semantic_score=scores["semantic_score"],
                domain_score=scores["domain_score"],
                final_score=scores["final_score"],
                explanation=scores["explanation"],
            )
        )
    db.commit()
    return RecommendationOut(rec_id=rec.id, method=rec.method, items=items)
