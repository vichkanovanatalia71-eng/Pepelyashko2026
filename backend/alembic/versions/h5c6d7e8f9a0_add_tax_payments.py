"""add tax_payments table

Revision ID: h5c6d7e8f9a0
Revises: g4b5c6d7e8f9
Create Date: 2026-02-20 12:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "h5c6d7e8f9a0"
down_revision = "g4b5c6d7e8f9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tax_payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("quarter", sa.Integer(), nullable=False),
        sa.Column("tax_type", sa.String(20), nullable=False),
        sa.Column("is_paid", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_tax_payments_user_id", "tax_payments", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_tax_payments_user_id", table_name="tax_payments")
    op.drop_table("tax_payments")
