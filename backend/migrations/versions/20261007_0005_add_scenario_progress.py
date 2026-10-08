"""Add per-profile narrative scenario progress.

Revision ID: 20261007_0005
Revises: 20261006_0004
"""
from alembic import op
import sqlalchemy as sa

revision = "20261007_0005"
down_revision = "20261006_0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "scenario_progress",
        sa.Column("profile_id", sa.Uuid(), nullable=False),
        sa.Column("scenario_key", sa.String(length=100), nullable=False),
        sa.Column("intro_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["profile_id"], ["learning_profiles.id"],
            name=op.f("fk_scenario_progress_profile_id_learning_profiles"), ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("profile_id", "scenario_key", name=op.f("pk_scenario_progress")),
    )


def downgrade():
    op.drop_table("scenario_progress")
