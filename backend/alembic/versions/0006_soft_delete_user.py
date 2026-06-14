"""soft-delete user accounts

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS original_phone VARCHAR(20)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS original_email VARCHAR(255)")

    # The plain unique on `phone` was already dropped in migration e5187cfa2437.
    # Email may still carry a unique constraint from the initial schema; drop it
    # defensively before swapping in partial unique indexes that exclude
    # soft-deleted rows so re-registration with a freed phone/email is possible.
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_email")
    op.execute("DROP INDEX IF EXISTS ix_users_email")
    op.execute("DROP INDEX IF EXISTS ix_users_phone")

    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_active "
        "ON users (phone) WHERE deleted_at IS NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_active "
        "ON users (email) WHERE deleted_at IS NULL AND email IS NOT NULL"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_phone ON users (phone)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_deleted_at ON users (deleted_at)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_deleted_at")
    op.execute("DROP INDEX IF EXISTS uq_users_email_active")
    op.execute("DROP INDEX IF EXISTS uq_users_phone_active")
    op.execute("DROP INDEX IF EXISTS ix_users_email")
    op.execute("DROP INDEX IF EXISTS ix_users_phone")

    op.execute("CREATE INDEX IF NOT EXISTS ix_users_phone ON users (phone)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")

    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS original_email")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS original_phone")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS deleted_at")
