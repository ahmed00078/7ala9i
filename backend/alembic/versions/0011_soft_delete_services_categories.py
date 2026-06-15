"""soft-delete services and service categories; protect bookings from cascade

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '0011'
down_revision: Union[str, None] = '0010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE services ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE"
    )
    op.execute(
        "ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_services_deleted_at ON services (deleted_at)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_service_categories_deleted_at ON service_categories (deleted_at)"
    )

    # Booking.service_id FK was CASCADE — meaning a service hard-delete (or a
    # category hard-delete cascading through services) wiped the booking
    # history with it. Switch to RESTRICT so the DB itself refuses to drop a
    # service that still has booking rows; the application layer must
    # soft-delete instead.
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_id_fkey")
    op.execute(
        "ALTER TABLE bookings "
        "ADD CONSTRAINT bookings_service_id_fkey "
        "FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_id_fkey")
    op.execute(
        "ALTER TABLE bookings "
        "ADD CONSTRAINT bookings_service_id_fkey "
        "FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE"
    )
    op.execute("DROP INDEX IF EXISTS ix_service_categories_deleted_at")
    op.execute("DROP INDEX IF EXISTS ix_services_deleted_at")
    op.execute("ALTER TABLE service_categories DROP COLUMN IF EXISTS deleted_at")
    op.execute("ALTER TABLE services DROP COLUMN IF EXISTS deleted_at")
