"""restructure expenses: add monthly expense tables, salary rates

Revision ID: m1b2c3d4e5f6
Revises: l0a1b2c3d4e5
Create Date: 2026-02-20 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "m1b2c3d4e5f6"
down_revision = "l0a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Нові ставки в nhsu_settings
    op.add_column("nhsu_settings", sa.Column("pdfo_rate", sa.Numeric(5, 2), nullable=False, server_default="18.0"))
    op.add_column("nhsu_settings", sa.Column("vz_zp_rate", sa.Numeric(5, 2), nullable=False, server_default="5.0"))
    op.add_column("nhsu_settings", sa.Column("esv_employer_rate", sa.Numeric(5, 2), nullable=False, server_default="22.0"))

    # 2. Зв'язок лікар↔співробітник
    op.add_column("staff_members", sa.Column("doctor_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_staff_members_doctor_id",
        "staff_members", "doctors",
        ["doctor_id"], ["id"],
    )

    # 3. Постійні витрати (Block 1)
    op.create_table(
        "monthly_fixed_expenses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("category_key", sa.String(50), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "year", "month", "category_key", name="uq_mfe"),
    )
    op.create_index("ix_monthly_fixed_expenses_user_id", "monthly_fixed_expenses", ["user_id"])

    # 4. Зарплатні витрати (Block 2)
    op.create_table(
        "monthly_salary_expenses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("staff_member_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("brutto", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("has_supplement", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("target_net", sa.Numeric(12, 2), nullable=True),
        sa.Column("individual_bonus", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("paid_services_from_module", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["staff_member_id"], ["staff_members.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "staff_member_id", "year", "month", name="uq_mse"),
    )
    op.create_index("ix_monthly_salary_expenses_user_id", "monthly_salary_expenses", ["user_id"])
    op.create_index("ix_monthly_salary_expenses_staff_member_id", "monthly_salary_expenses", ["staff_member_id"])


def downgrade() -> None:
    op.drop_index("ix_monthly_salary_expenses_staff_member_id", "monthly_salary_expenses")
    op.drop_index("ix_monthly_salary_expenses_user_id", "monthly_salary_expenses")
    op.drop_table("monthly_salary_expenses")

    op.drop_index("ix_monthly_fixed_expenses_user_id", "monthly_fixed_expenses")
    op.drop_table("monthly_fixed_expenses")

    op.drop_constraint("fk_staff_members_doctor_id", "staff_members", type_="foreignkey")
    op.drop_column("staff_members", "doctor_id")

    op.drop_column("nhsu_settings", "esv_employer_rate")
    op.drop_column("nhsu_settings", "vz_zp_rate")
    op.drop_column("nhsu_settings", "pdfo_rate")
