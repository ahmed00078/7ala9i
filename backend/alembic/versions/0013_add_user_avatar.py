"""add avatar_url to users

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-15 00:00:00.000000

Per-user profile photo, distinct from salon photos (SalonPhoto).
Nullable — existing users fall back to monogram avatars on the client.
"""
from typing import Sequence, Union

from alembic import op


revision: str = '0013'
down_revision: Union[str, None] = '0012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS avatar_url")
