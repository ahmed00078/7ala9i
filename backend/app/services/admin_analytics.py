from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def bookings_per_day(db: AsyncSession, days: int = 30) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        text("""
            SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day,
                   COUNT(*) AS count
            FROM bookings
            WHERE created_at >= :since
            GROUP BY 1
            ORDER BY 1
        """),
        {"since": since},
    )
    return [{"day": str(row.day), "count": row.count} for row in result]


async def revenue_per_month(db: AsyncSession, months: int = 6) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=months * 30)
    result = await db.execute(
        text("""
            SELECT date_trunc('month', created_at AT TIME ZONE 'UTC')::date AS month,
                   COALESCE(SUM(total_price), 0) AS revenue
            FROM bookings
            WHERE created_at >= :since
              AND status IN ('confirmed', 'completed')
            GROUP BY 1
            ORDER BY 1
        """),
        {"since": since},
    )
    return [{"month": str(row.month), "revenue": int(row.revenue)} for row in result]


async def top_salons(db: AsyncSession, limit: int = 10) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT s.id, s.name, s.city,
                   COUNT(b.id) AS booking_count,
                   COALESCE(SUM(b.total_price), 0) AS revenue
            FROM salons s
            LEFT JOIN bookings b ON b.salon_id = s.id
            GROUP BY s.id, s.name, s.city
            ORDER BY booking_count DESC
            LIMIT :limit
        """),
        {"limit": limit},
    )
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "city": row.city,
            "booking_count": row.booking_count,
            "revenue": int(row.revenue),
        }
        for row in result
    ]


async def signups_per_week(db: AsyncSession, weeks: int = 12) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    result = await db.execute(
        text("""
            SELECT date_trunc('week', created_at AT TIME ZONE 'UTC')::date AS week,
                   role,
                   COUNT(*) AS count
            FROM users
            WHERE created_at >= :since
              AND role IN ('client', 'owner')
            GROUP BY 1, 2
            ORDER BY 1
        """),
        {"since": since},
    )
    rows = result.all()
    weeks_map: dict[str, dict] = {}
    for row in rows:
        key = str(row.week)
        if key not in weeks_map:
            weeks_map[key] = {"week": key, "client": 0, "owner": 0}
        weeks_map[key][row.role] = row.count
    return list(weeks_map.values())


async def booking_status_distribution(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT status, COUNT(*) AS count
            FROM bookings
            GROUP BY status
            ORDER BY count DESC
        """)
    )
    return [{"status": row.status, "count": row.count} for row in result]
