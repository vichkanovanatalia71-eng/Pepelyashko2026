"""add esv_monthly to nhsu_settings

Moves the monthly ESV amount from a global config constant to a per-user
setting stored in nhsu_settings.  Existing rows receive the historical
default of 1760.00 UAH.

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-02-20 00:01:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "f3a4b5c6d7e8"
down_revision = "e2f3a4b5c6d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "nhsu_settings",
        sa.Column(
            "esv_monthly",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
            server_default="1760.00",
        ),
    )


def downgrade() -> None:
    op.drop_column("nhsu_settings", "esv_monthly")
