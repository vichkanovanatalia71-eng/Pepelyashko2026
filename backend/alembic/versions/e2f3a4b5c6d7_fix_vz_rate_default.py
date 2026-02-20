"""fix vz_rate default: change from 5.0 to 1.5

Auto-created nhsu_settings records used the wrong default (5.0) instead of
the actual base ФОП military tax rate (1.5%).  This migration corrects
records that still carry the old auto-generated value.

NOTE: records where vz_rate was *intentionally* set to 5.0 via the UI are
also updated.  Users who need 5% (post-2025 rate) can update their settings
via the Settings page.

Revision ID: e2f3a4b5c6d7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-20 00:00:00.000000

"""
from __future__ import annotations

from alembic import op

revision = "e2f3a4b5c6d7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change records that still have the old auto-created default (5.0) to 1.5
    op.execute(
        "UPDATE nhsu_settings SET vz_rate = 1.5 WHERE vz_rate = 5.0"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE nhsu_settings SET vz_rate = 5.0 WHERE vz_rate = 1.5"
    )
