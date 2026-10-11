"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, List


class QuestionOut(BaseModel):
    id: int
    text: str
    trait: str
    reverse: bool


class AssessmentStart(BaseModel):
    user_id: str
    adaptive: bool = False
    version: str = "1.0"


class SubmitAnswers(BaseModel):
    assessment_id: int
    answers: dict  # {question_id: value}
    complete: bool = True


class TraitScores(BaseModel):
    O: float
    C: float
    E: float
    A: float
    N: float


class ProfileOut(BaseModel):
    assessment_id: int
    traits: TraitScores
    standard_errors: dict
    mbti: Optional[str] = None
    items_asked: int
    is_adaptive: bool


class BiographyOut(BaseModel):
    id: int
    name: str
    domain: str
    summary: str
    traits: TraitScores
    trait_source: str
    trait_confidence: float
    domain_tags: List[str]
    birth_year: Optional[int] = None
    nationality: Optional[str] = None


class RecItemOut(BaseModel):
    rank: int
    biography: BiographyOut
    trait_score: float
    semantic_score: float
    domain_score: float
    final_score: float
    explanation: str


class RecommendationOut(BaseModel):
    rec_id: int
    method: str
    items: List[RecItemOut]


class NextQuestion(BaseModel):
    assessment_id: int
    question: QuestionOut
    items_asked: int
    estimated_remaining: int