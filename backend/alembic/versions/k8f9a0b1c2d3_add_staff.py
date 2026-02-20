"""add staff_members table and staff_member_id to expenses

Revision ID: k8f9a0b1c2d3
Revises: j7e8f9a0b1c2
Create Date: 2026-02-20 14:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "k8f9a0b1c2d3"
down_revision = "j7e8f9a0b1c2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "staff_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("position", sa.String(255), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_staff_members_user_id", "staff_members", ["user_id"])

    op.add_column(
        "expenses",
        sa.Column("staff_member_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_expenses_staff_member_id",
        "expenses",
        "staff_members",
        ["staff_member_id"],
        ["id"],
    )
    op.create_index("ix_expenses_staff_member_id", "expenses", ["staff_member_id"])


def downgrade() -> None:
    op.drop_index("ix_expenses_staff_member_id", "expenses")
    op.drop_constraint("fk_expenses_staff_member_id", "expenses", type_="foreignkey")
    op.drop_column("expenses", "staff_member_id")
    op.drop_index("ix_staff_members_user_id", "staff_members")
    op.drop_table("staff_members")
