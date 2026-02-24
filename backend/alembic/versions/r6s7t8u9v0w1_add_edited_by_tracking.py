"""add edited_by tracking to monthly expenses

Revision ID: r6s7t8u9v0w1
Revises: q5r6s7t8u9v0
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa

revision = "r6s7t8u9v0w1"
down_revision = "q5r6s7t8u9v0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("monthly_fixed_expenses", sa.Column("edited_by", sa.String(20), nullable=True))
    op.add_column("monthly_fixed_expenses", sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("monthly_salary_expenses", sa.Column("edited_by", sa.String(20), nullable=True))
    op.add_column("monthly_salary_expenses", sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("monthly_salary_expenses", "edited_at")
    op.drop_column("monthly_salary_expenses", "edited_by")
    op.drop_column("monthly_fixed_expenses", "edited_at")
    op.drop_column("monthly_fixed_expenses", "edited_by")
