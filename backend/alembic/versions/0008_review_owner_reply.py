"""review owner reply fields

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-14 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '0008'
down_revision: Union[str, None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS owner_reply TEXT")
    op.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS owner_reply_at TIMESTAMP WITH TIME ZONE")


def downgrade() -> None:
    op.execute("ALTER TABLE reviews DROP COLUMN IF EXISTS owner_reply_at")
    op.execute("ALTER TABLE reviews DROP COLUMN IF EXISTS owner_reply")
