"""Add password authentication credentials.

Revision ID: 20260920_0003
Revises: 20260915_0002
Create Date: 2026-09-20
"""

from alembic import op
import sqlalchemy as sa


revision = "20260920_0003"
down_revision = "20260915_0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_identities",
        sa.Column("password_hash", sa.String(length=512), nullable=True),
    )


def downgrade():
    op.drop_column("user_identities", "password_hash")
