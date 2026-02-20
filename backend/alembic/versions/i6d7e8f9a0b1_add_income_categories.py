"""add income_categories table and category_id to incomes

Revision ID: i6d7e8f9a0b1
Revises: h5c6d7e8f9a0
Create Date: 2026-02-20 14:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "i6d7e8f9a0b1"
down_revision = "h5c6d7e8f9a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "income_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column(
        "incomes",
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("income_categories.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("incomes", "category_id")
    op.drop_table("income_categories")
