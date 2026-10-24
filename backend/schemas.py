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
    # Phase 6 matching context (optional for backwards compatibility)
    life_stage: Optional[str] = None      # 18-24 | 25-34 | 35-44 | 45-54 | 55+
    career_phase: Optional[str] = None    # Student | Early career | Mid-career | ...
    themes: Optional[List[str]] = None    # 1-3 theme ids
    goal: Optional[str] = None


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
    # Phase 6 enrichment
    themes: Optional[List[str]] = None
    challenges: Optional[List[str]] = None
    fame_tier: Optional[int] = None
    peak_life_stage: Optional[str] = None
    source_url: Optional[str] = None


class BreakdownItemOut(BaseModel):
    key: str
    label: str
    weight: float
    raw: float
    weighted: float
    detail: str


class SharedTraitFact(BaseModel):
    trait: str
    label: str
    userValue: int
    bioValue: int
    gap: int
    note: str


class DifferenceFact(BaseModel):
    trait: str
    label: str
    userValue: int
    bioValue: int
    gap: int


class ExplanationOut(BaseModel):
    shared_traits: List[SharedTraitFact]
    shared_domains: List[str]
    shared_challenges: List[str]
    difference: Optional[DifferenceFact]
    text: str


class MatchOut(BaseModel):
    rank: int
    biography: BiographyOut
    score: float
    confidence: float
    confidence_label: str
    breakdown: List[BreakdownItemOut]
    explanation: ExplanationOut


class NextQuestion(BaseModel):
    assessment_id: int
    question: QuestionOut
    items_asked: int
    estimated_remaining: int