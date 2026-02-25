"""add composite indexes for performance optimization

Revision ID: s7t8u9v0w1x2
Revises: r6s7t8u9v0w1
Create Date: 2026-02-25
"""

from alembic import op

revision = "s7t8u9v0w1x2"
down_revision = "r6s7t8u9v0w1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_mfe_user_year_month", "monthly_fixed_expenses", ["user_id", "year", "month"])
    op.create_index("ix_moe_user_year_month", "monthly_other_expenses", ["user_id", "year", "month"])
    op.create_index("ix_nhsu_user_year_month", "nhsu_records", ["user_id", "year", "month"])
    op.create_index("ix_mpsr_user_year_month", "monthly_paid_services_reports", ["user_id", "year", "month"])
    op.create_index("ix_incomes_user_date", "incomes", ["user_id", "date"])
    op.create_index("ix_expenses_user_date", "expenses", ["user_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_expenses_user_date", table_name="expenses")
    op.drop_index("ix_incomes_user_date", table_name="incomes")
    op.drop_index("ix_mpsr_user_year_month", table_name="monthly_paid_services_reports")
    op.drop_index("ix_nhsu_user_year_month", table_name="nhsu_records")
    op.drop_index("ix_moe_user_year_month", table_name="monthly_other_expenses")
    op.drop_index("ix_mfe_user_year_month", table_name="monthly_fixed_expenses")
