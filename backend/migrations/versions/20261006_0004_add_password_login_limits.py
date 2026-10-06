"""Add persistent password-login attempt windows.

Revision ID: 20261006_0004
Revises: 20260920_0003
Create Date: 2026-10-06
"""

from alembic import op
import sqlalchemy as sa


revision = "20261006_0004"
down_revision = "20260920_0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "password_login_limits",
        sa.Column("email_digest", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.BigInteger(), nullable=False),
        sa.CheckConstraint("attempts > 0", name=op.f("ck_password_login_limits_positive_attempts")),
        sa.CheckConstraint("expires_at > 0", name=op.f("ck_password_login_limits_positive_expiry")),
        sa.PrimaryKeyConstraint("email_digest", name=op.f("pk_password_login_limits")),
    )
    op.create_index(op.f("ix_password_login_limits_expires_at"), "password_login_limits", ["expires_at"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_password_login_limits_expires_at"), table_name="password_login_limits")
    op.drop_table("password_login_limits")
