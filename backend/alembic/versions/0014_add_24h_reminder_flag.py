"""add reminder_24h_sent to bookings

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-17 00:00:00.000000

Tracks whether the ~24h-before appointment reminder has been sent, independently
of the existing ~1h reminder (reminder_sent). NOT NULL, defaults false so existing
rows are treated as "not yet reminded".
"""
from typing import Sequence, Union

from alembic import op


revision: str = '0014'
down_revision: Union[str, None] = '0013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_24h_sent "
        "BOOLEAN NOT NULL DEFAULT false"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE bookings DROP COLUMN IF EXISTS reminder_24h_sent")
