"""SQLAlchemy models for Persona-Connect."""
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime,
    ForeignKey, JSON, LargeBinary
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class Questionnaire(Base):
    __tablename__ = "questionnaires"
    id = Column(Integer, primary_key=True, index=True)
    instrument = Column(String(50), default="IPIP-50")
    scale_min = Column(Integer, default=1)
    scale_max = Column(Integer, default=5)
    item_order = Column(JSON)  # list of question ids in order
    description = Column(Text)


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    trait = Column(String(10), nullable=False)  # O, C, E, A, N
    reverse = Column(Boolean, default=False)
    domain = Column(String(50))  # optional domain tag

    responses = relationship("UserResponse", back_populates="question")


class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True)
    version = Column(String(20), default="1.0")
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    questionnaire_id = Column(Integer, ForeignKey("questionnaires.id"))
    is_adaptive = Column(Boolean, default=False)
    items_asked = Column(Integer, default=0)
    # user context for the matching engine (Phase 6)
    life_stage = Column(String(16), nullable=True)     # 18-24, 25-34, ... '55+'
    career_phase = Column(String(32), nullable=True)   # Student, Early career, ...
    themes = Column(JSON, nullable=True)               # challenge theme ids, e.g. ["creativity"]
    goal = Column(Text, nullable=True)                 # free-text goal, feeds S5

    questionnaire = relationship("Questionnaire")
    responses = relationship("UserResponse", back_populates="assessment")
    profile = relationship("PersonalityProfile", back_populates="assessment", uselist=False)
    recommendations = relationship("Recommendation", back_populates="assessment")


class UserResponse(Base):
    __tablename__ = "user_responses"
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    response_value = Column(Integer, nullable=False)  # 1-5
    answered_at = Column(DateTime, default=datetime.utcnow)

    assessment = relationship("Assessment", back_populates="responses")
    question = relationship("Question", back_populates="responses")


class PersonalityProfile(Base):
    __tablename__ = "personality_profiles"
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), unique=True)
    O_score = Column(Float)  # Openness
    C_score = Column(Float)  # Conscientiousness
    E_score = Column(Float)  # Extraversion
    A_score = Column(Float)  # Agreeableness
    N_score = Column(Float)  # Neuroticism
    O_se = Column(Float, default=0.0)  # standard error
    C_se = Column(Float, default=0.0)
    E_se = Column(Float, default=0.0)
    A_se = Column(Float, default=0.0)
    N_se = Column(Float, default=0.0)
    mbti = Column(String(4), nullable=True)
    scoring_version = Column(String(20), default="1.0")

    assessment = relationship("Assessment", back_populates="profile")

    @property
    def trait_vector(self):
        return [self.O_score, self.C_score, self.E_score, self.A_score, self.N_score]


class BiographyProfile(Base):
    __tablename__ = "biography_profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    slug = Column(String(128), unique=True, index=True)
    domain = Column(String(64))  # science, politics, arts, business, sport, activism
    summary = Column(Text)
    O_score = Column(Float)
    C_score = Column(Float)
    E_score = Column(Float)
    A_score = Column(Float)
    N_score = Column(Float)
    trait_source = Column(String(20), default="manual")  # manual, llm_estimated, survey
    trait_confidence = Column(Float, default=1.0)
    embedding = Column(LargeBinary, nullable=True)  # optional sentence embedding
    domain_tags = Column(JSON)  # e.g. ["leadership", "innovation"]
    birth_year = Column(Integer, nullable=True)
    nationality = Column(String(64), nullable=True)
    # enriched metadata for the matching engine (Phase 6)
    themes = Column(JSON, nullable=True)               # derived theme ids
    challenges = Column(JSON, nullable=True)           # derived challenge ids
    fame_tier = Column(Integer, nullable=True)         # 1 niche, 2 well-known, 3 household
    peak_life_stage = Column(String(16), nullable=True)  # early, mid, late
    source_url = Column(String(256), nullable=True)    # canonical wikipedia URL

    items = relationship("RecommendationItem", back_populates="biography")

    @property
    def trait_vector(self):
        return [self.O_score, self.C_score, self.E_score, self.A_score, self.N_score]


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    method = Column(String(32), default="trait_cosine")

    assessment = relationship("Assessment", back_populates="recommendations")
    items = relationship("RecommendationItem", back_populates="recommendation")


class RecommendationItem(Base):
    __tablename__ = "recommendation_items"
    id = Column(Integer, primary_key=True, index=True)
    rec_id = Column(Integer, ForeignKey("recommendations.id"), index=True)
    profile_id = Column(Integer, ForeignKey("biography_profiles.id"))
    rank = Column(Integer)
    trait_score = Column(Float)
    semantic_score = Column(Float, default=0.0)
    domain_score = Column(Float, default=0.0)
    final_score = Column(Float)
    explanation = Column(Text)

    recommendation = relationship("Recommendation", back_populates="items")
    biography = relationship("BiographyProfile", back_populates="items")


class Consent(Base):
    __tablename__ = "consent"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True)
    purpose = Column(String(128))
    granted = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class Feedback(Base):
    """Post-match user rating for one (assessment, biography) pair."""
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), index=True)
    biography_id = Column(Integer, ForeignKey("biography_profiles.id"))
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text)
    breakdown = Column(JSON)  # S1-S5 weighted contributions at request time
    created_at = Column(DateTime, default=datetime.utcnow)