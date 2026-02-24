"""fixed expenses: add name/description, remove category constraint

Replace hardcoded 7-category system with free-form named expenses.
Each fixed expense now has its own name and optional description.

Revision ID: q5r6s7t8u9v0
Revises: p4q5r6s7t8u9
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa

revision = "q5r6s7t8u9v0"
down_revision = "p4q5r6s7t8u9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add name and description columns
    op.add_column(
        "monthly_fixed_expenses",
        sa.Column("name", sa.String(255), nullable=False, server_default=""),
    )
    op.add_column(
        "monthly_fixed_expenses",
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
    )

    # 2. Populate name from existing category_key values
    op.execute(
        """
        UPDATE monthly_fixed_expenses SET name = CASE category_key
            WHEN 'rent'      THEN 'Оренда'
            WHEN 'utilities' THEN 'Комунальні'
            WHEN 'internet'  THEN 'Інтернет'
            WHEN 'phone'     THEN 'Телефон'
            WHEN 'bank'      THEN 'Банківські послуги'
            WHEN 'admin'     THEN 'Адміністративні витрати'
            WHEN 'other'     THEN 'Інші витрати'
            ELSE category_key
        END
        WHERE name = ''
        """
    )

    # 3. Drop old unique constraint (was: user_id + year + month + category_key)
    op.drop_constraint("uq_mfe", "monthly_fixed_expenses", type_="unique")


def downgrade() -> None:
    # Re-create unique constraint
    op.create_unique_constraint(
        "uq_mfe",
        "monthly_fixed_expenses",
        ["user_id", "year", "month", "category_key"],
    )
    op.drop_column("monthly_fixed_expenses", "description")
    op.drop_column("monthly_fixed_expenses", "name")
