"""context richness for matching engine

Revision ID: 0002_context
Revises: 0001_initial
Create Date: 2026-10-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002_context"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # user context captured at quiz start (Phase 6 matching inputs)
    op.add_column("assessments", sa.Column("life_stage", sa.String(length=16), nullable=True))
    op.add_column("assessments", sa.Column("career_phase", sa.String(length=32), nullable=True))
    op.add_column("assessments", sa.Column("themes", sa.JSON(), nullable=True))
    op.add_column("assessments", sa.Column("goal", sa.Text(), nullable=True))

    # enriched biography metadata for S2/S3/S4 engines and MMR constraints
    op.add_column("biography_profiles", sa.Column("themes", sa.JSON(), nullable=True))
    op.add_column("biography_profiles", sa.Column("challenges", sa.JSON(), nullable=True))
    op.add_column("biography_profiles", sa.Column("fame_tier", sa.Integer(), nullable=True))
    op.add_column("biography_profiles", sa.Column("peak_life_stage", sa.String(length=16), nullable=True))
    op.add_column("biography_profiles", sa.Column("source_url", sa.String(length=256), nullable=True))


def downgrade() -> None:
    op.drop_column("biography_profiles", "source_url")
    op.drop_column("biography_profiles", "peak_life_stage")
    op.drop_column("biography_profiles", "fame_tier")
    op.drop_column("biography_profiles", "challenges")
    op.drop_column("biography_profiles", "themes")
    op.drop_column("assessments", "goal")
    op.drop_column("assessments", "themes")
    op.drop_column("assessments", "career_phase")
    op.drop_column("assessments", "life_stage")
