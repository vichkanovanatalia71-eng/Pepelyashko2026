"""add monthly_period_cash table

Revision ID: g4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-02-20 10:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "g4b5c6d7e8f9"
down_revision = "f3a4b5c6d7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monthly_period_cash",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column("period_month", sa.Integer(), nullable=False),
        sa.Column(
            "amount",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "period_year", "period_month", name="uq_period_cash"
        ),
    )
    op.create_index(
        "ix_monthly_period_cash_user_id", "monthly_period_cash", ["user_id"]
    )

    # Перенести готівку з існуючих звітів у нову таблицю
    # (один запис на period — беремо суму з першого звіту, де cash > 0)
    op.execute(
        """
        INSERT INTO monthly_period_cash (user_id, period_year, period_month, amount, created_at)
        SELECT DISTINCT ON (user_id, year, month)
            user_id, year, month, cash_in_register, NOW()
        FROM monthly_paid_services_reports
        WHERE cash_in_register > 0
        ORDER BY user_id, year, month, id ASC
        """
    )


def downgrade() -> None:
    op.drop_index("ix_monthly_period_cash_user_id", table_name="monthly_period_cash")
    op.drop_table("monthly_period_cash")
