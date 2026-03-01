"""add snapshot columns to monthly_expense_locks

Revision ID: w1x2y3z4a5b6
Revises: v0w1x2y3z4a5
Create Date: 2026-03-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "w1x2y3z4a5b6"
down_revision = "v0w1x2y3z4a5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("monthly_expense_locks", sa.Column("snapshot", JSONB, nullable=True))
    op.add_column("monthly_expense_locks", sa.Column("other_expenses_snapshot", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("monthly_expense_locks", "other_expenses_snapshot")
    op.drop_column("monthly_expense_locks", "snapshot")
