from datetime import datetime, time
from typing import Iterable

from app.models.salon_closure import SalonClosure
from app.models.working_hours import WorkingHours


def compute_is_open_now(
    working_hours: Iterable[WorkingHours],
    closures: Iterable[SalonClosure],
    now: datetime,
) -> tuple[bool, time | None]:
    """Return (is_open, close_time_today).

    Treats ``now`` as the salon-local datetime — Nouakchott is UTC+0 with no DST,
    so callers can pass a UTC datetime directly today.

    Open requires: today's WorkingHours exists, ``is_closed`` is False, the
    current time is within [open_time, close_time), and no overlapping
    SalonClosure spans the current instant.
    """
    day_of_week = now.weekday()  # 0=Mon to 6=Sun
    todays_hours: WorkingHours | None = None
    for wh in working_hours:
        if wh.day_of_week == day_of_week:
            todays_hours = wh
            break

    if not todays_hours or todays_hours.is_closed:
        return False, None

    current_time = now.time()
    if not (todays_hours.open_time <= current_time < todays_hours.close_time):
        return False, todays_hours.close_time

    for closure in closures:
        if closure.start_at <= now < closure.end_at:
            return False, todays_hours.close_time

    return True, todays_hours.close_time
