"""initial

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "questionnaires",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("instrument", sa.String(length=50), nullable=True),
        sa.Column("scale_min", sa.Integer(), nullable=True),
        sa.Column("scale_max", sa.Integer(), nullable=True),
        sa.Column("item_order", sa.JSON(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_questionnaires_id"), "questionnaires", ["id"], unique=False)

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("trait", sa.String(length=10), nullable=False),
        sa.Column("reverse", sa.Boolean(), nullable=True),
        sa.Column("domain", sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_questions_id"), "questions", ["id"], unique=False)

    op.create_table(
        "assessments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("version", sa.String(length=20), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("questionnaire_id", sa.Integer(), nullable=True),
        sa.Column("is_adaptive", sa.Boolean(), nullable=True),
        sa.Column("items_asked", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["questionnaire_id"], ["questionnaires.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assessments_id"), "assessments", ["id"], unique=False)
    op.create_index(op.f("ix_assessments_user_id"), "assessments", ["user_id"], unique=False)

    op.create_table(
        "user_responses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("assessment_id", sa.Integer(), nullable=True),
        sa.Column("question_id", sa.Integer(), nullable=True),
        sa.Column("response_value", sa.Integer(), nullable=False),
        sa.Column("answered_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_responses_id"), "user_responses", ["id"], unique=False)
    op.create_index(op.f("ix_user_responses_assessment_id"), "user_responses", ["assessment_id"], unique=False)

    op.create_table(
        "personality_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("assessment_id", sa.Integer(), nullable=True),
        sa.Column("O_score", sa.Float(), nullable=True),
        sa.Column("C_score", sa.Float(), nullable=True),
        sa.Column("E_score", sa.Float(), nullable=True),
        sa.Column("A_score", sa.Float(), nullable=True),
        sa.Column("N_score", sa.Float(), nullable=True),
        sa.Column("O_se", sa.Float(), nullable=True),
        sa.Column("C_se", sa.Float(), nullable=True),
        sa.Column("E_se", sa.Float(), nullable=True),
        sa.Column("A_se", sa.Float(), nullable=True),
        sa.Column("N_se", sa.Float(), nullable=True),
        sa.Column("mbti", sa.String(length=4), nullable=True),
        sa.Column("scoring_version", sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assessment_id"),
    )
    op.create_index(op.f("ix_personality_profiles_id"), "personality_profiles", ["id"], unique=False)

    op.create_table(
        "biography_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=True),
        sa.Column("domain", sa.String(length=64), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("O_score", sa.Float(), nullable=True),
        sa.Column("C_score", sa.Float(), nullable=True),
        sa.Column("E_score", sa.Float(), nullable=True),
        sa.Column("A_score", sa.Float(), nullable=True),
        sa.Column("N_score", sa.Float(), nullable=True),
        sa.Column("trait_source", sa.String(length=20), nullable=True),
        sa.Column("trait_confidence", sa.Float(), nullable=True),
        sa.Column("embedding", sa.LargeBinary(), nullable=True),
        sa.Column("domain_tags", sa.JSON(), nullable=True),
        sa.Column("birth_year", sa.Integer(), nullable=True),
        sa.Column("nationality", sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_biography_profiles_id"), "biography_profiles", ["id"], unique=False)
    op.create_index(op.f("ix_biography_profiles_slug"), "biography_profiles", ["slug"], unique=True)

    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("assessment_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("method", sa.String(length=32), nullable=True),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recommendations_id"), "recommendations", ["id"], unique=False)
    op.create_index(op.f("ix_recommendations_assessment_id"), "recommendations", ["assessment_id"], unique=False)

    op.create_table(
        "recommendation_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rec_id", sa.Integer(), nullable=True),
        sa.Column("profile_id", sa.Integer(), nullable=True),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("trait_score", sa.Float(), nullable=True),
        sa.Column("semantic_score", sa.Float(), nullable=True),
        sa.Column("domain_score", sa.Float(), nullable=True),
        sa.Column("final_score", sa.Float(), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["profile_id"], ["biography_profiles.id"]),
        sa.ForeignKeyConstraint(["rec_id"], ["recommendations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recommendation_items_id"), "recommendation_items", ["id"], unique=False)
    op.create_index(op.f("ix_recommendation_items_rec_id"), "recommendation_items", ["rec_id"], unique=False)

    op.create_table(
        "consent",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("purpose", sa.String(length=128), nullable=True),
        sa.Column("granted", sa.Boolean(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_consent_id"), "consent", ["id"], unique=False)
    op.create_index(op.f("ix_consent_user_id"), "consent", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_consent_user_id"), table_name="consent")
    op.drop_index(op.f("ix_consent_id"), table_name="consent")
    op.drop_table("consent")
    op.drop_index(op.f("ix_recommendation_items_rec_id"), table_name="recommendation_items")
    op.drop_index(op.f("ix_recommendation_items_id"), table_name="recommendation_items")
    op.drop_table("recommendation_items")
    op.drop_index(op.f("ix_recommendations_assessment_id"), table_name="recommendations")
    op.drop_index(op.f("ix_recommendations_id"), table_name="recommendations")
    op.drop_table("recommendations")
    op.drop_index(op.f("ix_biography_profiles_slug"), table_name="biography_profiles")
    op.drop_index(op.f("ix_biography_profiles_id"), table_name="biography_profiles")
    op.drop_table("biography_profiles")
    op.drop_index(op.f("ix_personality_profiles_id"), table_name="personality_profiles")
    op.drop_table("personality_profiles")
    op.drop_index(op.f("ix_user_responses_assessment_id"), table_name="user_responses")
    op.drop_index(op.f("ix_user_responses_id"), table_name="user_responses")
    op.drop_table("user_responses")
    op.drop_index(op.f("ix_assessments_user_id"), table_name="assessments")
    op.drop_index(op.f("ix_assessments_id"), table_name="assessments")
    op.drop_table("assessments")
    op.drop_index(op.f("ix_questions_id"), table_name="questions")
    op.drop_table("questions")
    op.drop_index(op.f("ix_questionnaires_id"), table_name="questionnaires")
    op.drop_table("questionnaires")
