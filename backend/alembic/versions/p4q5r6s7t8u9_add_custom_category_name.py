"""add category_name to monthly_fixed_expenses

Revision ID: p4q5r6s7t8u9
Revises: o3p4q5r6s7t8
Create Date: 2026-02-23

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "p4q5r6s7t8u9"
down_revision = "o3p4q5r6s7t8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "monthly_fixed_expenses",
        sa.Column("category_name", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("monthly_fixed_expenses", "category_name")
