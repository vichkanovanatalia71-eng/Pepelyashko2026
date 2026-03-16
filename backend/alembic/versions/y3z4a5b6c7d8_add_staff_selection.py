"""add monthly staff selection

Revision ID: y3z4a5b6c7d8
Revises: x2y3z4a5b6c7
Create Date: 2026-03-02

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "y3z4a5b6c7d8"
down_revision = "x2y3z4a5b6c7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monthly_staff_selections",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("month", sa.Integer, nullable=False),
        sa.Column("hired_doctor_id", sa.Integer, sa.ForeignKey("doctors.id"), nullable=True),
        sa.Column("hired_nurse_id", sa.Integer, sa.ForeignKey("staff_members.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "year", "month", name="uq_mss"),
    )


def downgrade() -> None:
    op.drop_table("monthly_staff_selections")
