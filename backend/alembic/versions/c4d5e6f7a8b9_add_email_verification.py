"""add email verification fields to users

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-02-19 12:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "c4d5e6f7a8b9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "users",
        sa.Column("verification_token", sa.String(255), nullable=True),
    )
    # Існуючі користувачі вважаються вже підтвердженими
    op.execute("UPDATE users SET is_verified = true")


def downgrade() -> None:
    op.drop_column("users", "verification_token")
    op.drop_column("users", "is_verified")
