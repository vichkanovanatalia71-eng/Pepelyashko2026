"""add monthly paid services and share reports tables

Revision ID: a1b2c3d4e5f6
Revises: f7a8b9c0d1e2
Create Date: 2026-02-19 16:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "a1b2c3d4e5f6"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Місячні звіти ──
    op.create_table(
        "monthly_paid_services_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("cash_in_register", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=10), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "doctor_id", "year", "month", name="uq_mps_report"),
    )
    op.create_index("ix_mps_reports_user_id", "monthly_paid_services_reports", ["user_id"])
    op.create_index("ix_mps_reports_doctor_id", "monthly_paid_services_reports", ["doctor_id"])

    # ── Записи послуг звіту ──
    op.create_table(
        "monthly_paid_service_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["report_id"], ["monthly_paid_services_reports.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("report_id", "service_id", name="uq_mps_entry"),
    )
    op.create_index("ix_mps_entries_report_id", "monthly_paid_service_entries", ["report_id"])
    op.create_index("ix_mps_entries_service_id", "monthly_paid_service_entries", ["service_id"])

    # ── Share-звіти ──
    op.create_table(
        "share_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("filter_snapshot", JSONB(), nullable=False),
        sa.Column("payload_snapshot", JSONB(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index("ix_share_reports_token", "share_reports", ["token"], unique=True)
    op.create_index("ix_share_reports_user_id", "share_reports", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_share_reports_user_id", table_name="share_reports")
    op.drop_index("ix_share_reports_token", table_name="share_reports")
    op.drop_table("share_reports")

    op.drop_index("ix_mps_entries_service_id", table_name="monthly_paid_service_entries")
    op.drop_index("ix_mps_entries_report_id", table_name="monthly_paid_service_entries")
    op.drop_table("monthly_paid_service_entries")

    op.drop_index("ix_mps_reports_doctor_id", table_name="monthly_paid_services_reports")
    op.drop_index("ix_mps_reports_user_id", table_name="monthly_paid_services_reports")
    op.drop_table("monthly_paid_services_reports")
