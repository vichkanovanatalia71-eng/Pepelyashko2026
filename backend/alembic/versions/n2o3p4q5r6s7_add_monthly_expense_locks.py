"""add monthly expense locks

Revision ID: n2o3p4q5r6s7
Revises: m1b2c3d4e5f6
Create Date: 2026-02-21 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "n2o3p4q5r6s7"
down_revision = "m1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monthly_expense_locks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "year", "month", name="uq_mel"),
    )
    op.create_index("ix_monthly_expense_locks_user_id", "monthly_expense_locks", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_monthly_expense_locks_user_id", table_name="monthly_expense_locks")
    op.drop_table("monthly_expense_locks")
