"""add budget planning tables

Revision ID: l0a1b2c3d4e5
Revises: k8f9a0b1c2d3
Create Date: 2026-02-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "l0a1b2c3d4e5"
down_revision = "k8f9a0b1c2d3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "budget_rows",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("section", sa.String(20), nullable=False, server_default="fixed"),
        sa.Column("sub_type", sa.String(20), nullable=False, server_default="fixed"),
        sa.Column("input_type", sa.String(20), nullable=False, server_default="manual"),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500), nullable=False, server_default=""),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_info_row", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("formula_key", sa.String(100), nullable=True),
        sa.Column("staff_member_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["staff_member_id"], ["staff_members.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_budget_rows_user_id", "budget_rows", ["user_id"])

    op.create_table(
        "budget_cells",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("row_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("value", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["row_id"], ["budget_rows.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("row_id", "year", "month"),
    )
    op.create_index("ix_budget_cells_row_id", "budget_cells", ["row_id"])


def downgrade() -> None:
    op.drop_index("ix_budget_cells_row_id", "budget_cells")
    op.drop_table("budget_cells")
    op.drop_index("ix_budget_rows_user_id", "budget_rows")
    op.drop_table("budget_rows")
