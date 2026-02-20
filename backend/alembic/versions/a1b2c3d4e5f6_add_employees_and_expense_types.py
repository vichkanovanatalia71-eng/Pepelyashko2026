"""add employees and expense types

Revision ID: a1b2c3d4e5f6
Revises: d22ac519fddb
Create Date: 2026-02-20 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd22ac519fddb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create employees table
    op.create_table(
        'employees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('position', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('staff_type', sa.String(length=50), nullable=False, server_default='other'),
        sa.Column('salary', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_employees_user_id', 'employees', ['user_id'])

    # Add new columns to expenses table
    op.add_column('expenses', sa.Column(
        'expense_type', sa.String(length=50), nullable=False, server_default='other'
    ))
    op.add_column('expenses', sa.Column(
        'is_recurring', sa.Boolean(), nullable=False, server_default='false'
    ))
    op.add_column('expenses', sa.Column(
        'employee_id', sa.Integer(), nullable=True
    ))
    op.create_index('ix_expenses_expense_type', 'expenses', ['expense_type'])
    op.create_foreign_key(
        'fk_expenses_employee_id', 'expenses', 'employees',
        ['employee_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_expenses_employee_id', 'expenses', type_='foreignkey')
    op.drop_index('ix_expenses_expense_type', table_name='expenses')
    op.drop_column('expenses', 'employee_id')
    op.drop_column('expenses', 'is_recurring')
    op.drop_column('expenses', 'expense_type')
    op.drop_index('ix_employees_user_id', table_name='employees')
    op.drop_table('employees')
