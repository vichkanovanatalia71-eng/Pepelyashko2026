"""sync doctor staff members

Revision ID: o3p4q5r6s7t8
Revises: n2o3p4q5r6s7
Create Date: 2026-02-21

For every non-owner active Doctor that has no linked active StaffMember,
automatically create a StaffMember(role="doctor", doctor_id=doctor.id).
"""
from alembic import op

revision = "o3p4q5r6s7t8"
down_revision = "n2o3p4q5r6s7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO staff_members (user_id, full_name, role, position, doctor_id, is_active, created_at)
        SELECT d.user_id, d.full_name, 'doctor', '', d.id, true, NOW()
        FROM doctors d
        WHERE d.is_owner = false
          AND d.is_active = true
          AND NOT EXISTS (
              SELECT 1 FROM staff_members s
              WHERE s.doctor_id = d.id
                AND s.is_active = true
          )
    """)


def downgrade() -> None:
    # Data-only migration; no schema changes to revert.
    pass
