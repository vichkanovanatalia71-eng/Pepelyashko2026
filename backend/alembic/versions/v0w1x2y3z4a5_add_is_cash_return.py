"""add is_cash_return to fixed and other expenses

Revision ID: v0w1x2y3z4a5
Revises: u9v0w1x2y3z4
Create Date: 2026-03-01
"""

from alembic import op
import sqlalchemy as sa

revision = "v0w1x2y3z4a5"
down_revision = "u9v0w1x2y3z4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "monthly_fixed_expenses",
        sa.Column("is_cash_return", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "monthly_other_expenses",
        sa.Column("is_cash_return", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("monthly_other_expenses", "is_cash_return")
    op.drop_column("monthly_fixed_expenses", "is_cash_return")
