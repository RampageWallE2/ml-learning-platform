"""Create learning profiles and lesson progress.

Revision ID: 20260915_0001
Revises:
Create Date: 2026-09-15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260915_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "learning_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_learning_profiles")),
    )

    op.create_table(
        "lesson_progress",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("profile_id", sa.Uuid(), nullable=False),
        sa.Column("lesson_id", sa.String(length=100), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="in_progress",
            nullable=False,
        ),
        sa.Column(
            "current_step",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "current_step >= 0",
            name=op.f("ck_lesson_progress_nonnegative_current_step"),
        ),
        sa.CheckConstraint(
            "status IN ('in_progress', 'completed')",
            name=op.f("ck_lesson_progress_valid_status"),
        ),
        sa.ForeignKeyConstraint(
            ["profile_id"],
            ["learning_profiles.id"],
            name=op.f("fk_lesson_progress_profile_id_learning_profiles"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_lesson_progress")),
        sa.UniqueConstraint(
            "profile_id",
            "lesson_id",
            name="uq_lesson_progress_profile_lesson",
        ),
    )
    op.create_index(
        op.f("ix_lesson_progress_profile_id"),
        "lesson_progress",
        ["profile_id"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        op.f("ix_lesson_progress_profile_id"),
        table_name="lesson_progress",
    )
    op.drop_table("lesson_progress")
    op.drop_table("learning_profiles")
