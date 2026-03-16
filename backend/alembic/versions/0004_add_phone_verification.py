"""add phone verification: is_phone_verified on users + phone_verifications table

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_phone_verified to users (IF NOT EXISTS for idempotency)
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN NOT NULL DEFAULT false
    """)
    # Grandfather all existing users as verified
    op.execute("UPDATE users SET is_phone_verified = true")

    # Create phone_verifications table (IF NOT EXISTS for idempotency)
    op.execute("""
        CREATE TABLE IF NOT EXISTS phone_verifications (
            id UUID NOT NULL,
            phone VARCHAR(20) NOT NULL,
            code VARCHAR(6) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            is_used BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            PRIMARY KEY (id)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_phone_verifications_phone
        ON phone_verifications (phone)
    """)


def downgrade() -> None:
    op.drop_index('ix_phone_verifications_phone', table_name='phone_verifications')
    op.drop_table('phone_verifications')
    op.drop_column('users', 'is_phone_verified')
