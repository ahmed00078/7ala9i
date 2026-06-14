"""booking payment_method

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-14 00:00:03.000000

Adds nullable `payment_method` column on bookings so owners can tag how
each completed booking was paid (cash / Bankily / Sedad). Legacy completed
bookings stay NULL and surface as "Not set" in the earnings breakdown.
"""
from typing import Sequence, Union

from alembic import op


revision: str = '0009'
down_revision: Union[str, None] = '0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE payment_method AS ENUM ('cash', 'bankily', 'sedad'); "
        "EXCEPTION WHEN duplicate_object THEN null; "
        "END $$;"
    )
    op.execute(
        "ALTER TABLE bookings "
        "ADD COLUMN IF NOT EXISTS payment_method payment_method"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE bookings DROP COLUMN IF EXISTS payment_method")
    op.execute("DROP TYPE IF EXISTS payment_method")
