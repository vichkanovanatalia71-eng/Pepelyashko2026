"""add visible_to_accountant to fixed and other expenses

Revision ID: u9v0w1x2y3z4
Revises: t8u9v0w1x2y3
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

revision = "u9v0w1x2y3z4"
down_revision = "t8u9v0w1x2y3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "monthly_fixed_expenses",
        sa.Column("visible_to_accountant", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "monthly_other_expenses",
        sa.Column("visible_to_accountant", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_column("monthly_other_expenses", "visible_to_accountant")
    op.drop_column("monthly_fixed_expenses", "visible_to_accountant")
