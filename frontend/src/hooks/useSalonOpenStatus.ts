import { useMemo } from 'react';

export interface WorkingHour {
  day_of_week: number; // 0 = Mon … 6 = Sun (matches backend)
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface SalonOpenStatus {
  isOpen: boolean;
  /** "HH:MM" close time today if open, otherwise the next opening. */
  todayLabel: string | null;
  closesAt: string | null;
}

/**
 * §5.5 — derives today's open/close state from a salon's working_hours.
 *
 * The plan calls for "Open until 21:00" on the salon hero. We don't have an
 * `is_open` field from the backend, so we compute it from the day-of-week +
 * a wall-clock comparison. UTC date is intentional — matches the backend
 * convention (CLAUDE.md: always UTC dates).
 */
export function useSalonOpenStatus(workingHours: WorkingHour[] | undefined | null): SalonOpenStatus {
  return useMemo(() => {
    if (!workingHours?.length) return { isOpen: false, todayLabel: null, closesAt: null };

    const now = new Date();
    // JS getDay(): 0 = Sun … 6 = Sat. Backend: 0 = Mon … 6 = Sun.
    const dow = (now.getDay() + 6) % 7;
    const today = workingHours.find((h) => h.day_of_week === dow);
    if (!today || today.is_closed) return { isOpen: false, todayLabel: null, closesAt: null };

    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const open = toMinutes(today.open_time);
    const close = toMinutes(today.close_time);

    const isOpen = minutesNow >= open && minutesNow < close;
    return {
      isOpen,
      todayLabel: isOpen ? today.close_time.slice(0, 5) : today.open_time.slice(0, 5),
      closesAt: today.close_time.slice(0, 5),
    };
  }, [workingHours]);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
