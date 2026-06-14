"""unify payment_method bankily+sedad → mobile

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-14 00:00:04.000000

Owners told us they don't track which banking app the client used (Bankily
vs Sedad vs Masrvi vs whatever comes next). Collapse the enum to two
values: `cash` and `mobile`. Existing bankily / sedad rows are migrated
to `mobile` before the type is rewritten — Postgres can't drop enum
values in place, so the recipe is create-new-type, ALTER TABLE USING
cast, DROP old, RENAME.
"""
from typing import Sequence, Union

from alembic import op


revision: str = '0010'
down_revision: Union[str, None] = '0009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Fold bankily / sedad into a shared placeholder string before we cast.
    #    We can't write 'mobile' yet because the old enum type doesn't know it.
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN payment_method TYPE text "
        "USING payment_method::text"
    )
    op.execute("DROP TYPE IF EXISTS payment_method")
    op.execute(
        "UPDATE bookings SET payment_method = 'mobile' "
        "WHERE payment_method IN ('bankily', 'sedad')"
    )
    op.execute("CREATE TYPE payment_method AS ENUM ('cash', 'mobile')")
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN payment_method TYPE payment_method "
        "USING payment_method::payment_method"
    )


def downgrade() -> None:
    # Rollback to the 3-value enum. Past `mobile` rows land back as 'bankily'
    # (we can't recover which specific app they were).
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN payment_method TYPE text "
        "USING payment_method::text"
    )
    op.execute("DROP TYPE IF EXISTS payment_method")
    op.execute(
        "UPDATE bookings SET payment_method = 'bankily' "
        "WHERE payment_method = 'mobile'"
    )
    op.execute(
        "CREATE TYPE payment_method AS ENUM ('cash', 'bankily', 'sedad')"
    )
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN payment_method TYPE payment_method "
        "USING payment_method::payment_method"
    )
