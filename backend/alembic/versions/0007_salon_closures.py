"""salon_closures (ad-hoc closures and block-slots)

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-14 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '0007'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS salon_closures (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
            start_at TIMESTAMP WITH TIME ZONE NOT NULL,
            end_at TIMESTAMP WITH TIME ZONE NOT NULL,
            reason VARCHAR(140),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            PRIMARY KEY (id),
            CONSTRAINT check_closure_range CHECK (end_at > start_at)
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_salon_closures_salon_range "
        "ON salon_closures (salon_id, start_at, end_at)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_salon_closures_salon_range")
    op.execute("DROP TABLE IF EXISTS salon_closures")
