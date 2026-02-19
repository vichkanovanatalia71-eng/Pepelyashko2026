"""add services table

Revision ID: f7a8b9c0d1e2
Revises: c4d5e6f7a8b9
Create Date: 2026-02-19 14:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "f7a8b9c0d1e2"
down_revision = "c4d5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("materials", JSONB(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "code", name="uq_service_user_code"),
    )
    op.create_index(op.f("ix_services_user_id"), "services", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_services_user_id"), table_name="services")
    op.drop_table("services")
