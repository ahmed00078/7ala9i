"""add admin_audit_log table and suspension columns

Revision ID: 0005
Revises: e5187cfa2437
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


revision: str = '0005'
down_revision: Union[str, None] = 'e5187cfa2437'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS admin_audit_log (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(100) NOT NULL,
            target_type VARCHAR(50),
            target_id UUID,
            reason TEXT,
            extra JSONB,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            PRIMARY KEY (id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_admin_audit_log_created_at ON admin_audit_log (created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_admin_audit_log_target ON admin_audit_log (target_type, target_id)")

    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT")

    op.execute("ALTER TABLE salons ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE salons ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE salons ADD COLUMN IF NOT EXISTS suspended_reason TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE salons DROP COLUMN IF EXISTS suspended_reason")
    op.execute("ALTER TABLE salons DROP COLUMN IF EXISTS suspended_at")
    op.execute("ALTER TABLE salons DROP COLUMN IF EXISTS is_suspended")

    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS suspended_reason")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS suspended_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_suspended")

    op.execute("DROP INDEX IF EXISTS ix_admin_audit_log_target")
    op.execute("DROP INDEX IF EXISTS ix_admin_audit_log_created_at")
    op.execute("DROP TABLE IF EXISTS admin_audit_log")
