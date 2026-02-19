"""add missing tables and columns

Revision ID: a1b2c3d4e5f6
Revises: d22ac519fddb
Create Date: 2026-02-19 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd22ac519fddb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns to users table
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('verification_token', sa.String(length=255), nullable=True))

    # Create user_api_keys table
    op.create_table('user_api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('anthropic_key', sa.String(length=512), nullable=True),
        sa.Column('openai_key', sa.String(length=512), nullable=True),
        sa.Column('xai_key', sa.String(length=512), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_api_keys_user'),
    )
    op.create_index(op.f('ix_user_api_keys_user_id'), 'user_api_keys', ['user_id'], unique=True)

    # Create services table
    op.create_table('services',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('materials', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'code', name='uq_service_user_code'),
    )
    op.create_index(op.f('ix_services_user_id'), 'services', ['user_id'], unique=False)

    # Create monthly_paid_services_reports table
    op.create_table('monthly_paid_services_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('doctor_id', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('cash_in_register', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=10), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'doctor_id', 'year', 'month', name='uq_mps_report'),
    )
    op.create_index(op.f('ix_monthly_paid_services_reports_user_id'), 'monthly_paid_services_reports', ['user_id'], unique=False)
    op.create_index(op.f('ix_monthly_paid_services_reports_doctor_id'), 'monthly_paid_services_reports', ['doctor_id'], unique=False)

    # Create monthly_paid_service_entries table
    op.create_table('monthly_paid_service_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['report_id'], ['monthly_paid_services_reports.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('report_id', 'service_id', name='uq_mps_entry'),
    )
    op.create_index(op.f('ix_monthly_paid_service_entries_report_id'), 'monthly_paid_service_entries', ['report_id'], unique=False)
    op.create_index(op.f('ix_monthly_paid_service_entries_service_id'), 'monthly_paid_service_entries', ['service_id'], unique=False)

    # Create share_reports table
    op.create_table('share_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column('filter_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('payload_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_share_reports_user_id'), 'share_reports', ['user_id'], unique=False)
    op.create_index(op.f('ix_share_reports_token'), 'share_reports', ['token'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_share_reports_token'), table_name='share_reports')
    op.drop_index(op.f('ix_share_reports_user_id'), table_name='share_reports')
    op.drop_table('share_reports')

    op.drop_index(op.f('ix_monthly_paid_service_entries_service_id'), table_name='monthly_paid_service_entries')
    op.drop_index(op.f('ix_monthly_paid_service_entries_report_id'), table_name='monthly_paid_service_entries')
    op.drop_table('monthly_paid_service_entries')

    op.drop_index(op.f('ix_monthly_paid_services_reports_doctor_id'), table_name='monthly_paid_services_reports')
    op.drop_index(op.f('ix_monthly_paid_services_reports_user_id'), table_name='monthly_paid_services_reports')
    op.drop_table('monthly_paid_services_reports')

    op.drop_index(op.f('ix_services_user_id'), table_name='services')
    op.drop_table('services')

    op.drop_index(op.f('ix_user_api_keys_user_id'), table_name='user_api_keys')
    op.drop_table('user_api_keys')

    op.drop_column('users', 'verification_token')
    op.drop_column('users', 'is_verified')
