"""add edited_by tracking to monthly_other_expenses

Revision ID: t8u9v0w1x2y3
Revises: s7t8u9v0w1x2
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

revision = "t8u9v0w1x2y3"
down_revision = "s7t8u9v0w1x2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("monthly_other_expenses", sa.Column("edited_by", sa.String(20), nullable=True))
    op.add_column("monthly_other_expenses", sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("monthly_other_expenses", "edited_at")
    op.drop_column("monthly_other_expenses", "edited_by")
