import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ar, fr, enUS } from 'date-fns/locale';
import i18n from '../i18n';

const localeMap: Record<string, Locale> = {
  ar,
  fr,
  en: enUS,
};

function getLocale(): Locale {
  return localeMap[i18n.language] || ar;
}

export function formatCurrency(amount: number): string {
  return `${Math.round(amount)} MRU`;
}

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'dd MMMM yyyy', { locale: getLocale() });
}

export function formatDateShort(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'dd/MM/yyyy');
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const m = minutes;
  if (i18n.language === 'en') {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${period}`;
  }
  return `${hours}:${m}`;
}

export function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  const t = i18n.t;

  if (isToday(date)) {
    return t('common.today');
  }
  if (isTomorrow(date)) {
    return t('common.tomorrow');
  }
  if (isYesterday(date)) {
    return t('common.yesterday');
  }
  return format(date, 'EEEE dd MMMM', { locale: getLocale() });
}

export function formatDuration(minutes: number): string {
  const t = i18n.t;
  if (minutes < 60) {
    return `${minutes} ${t('common.minutes')}`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) {
    return `${hours} ${t('common.hours')}`;
  }
  return `${hours} ${t('common.hours')} ${remaining} ${t('common.minutes')}`;
}

export function formatPhone(phone: string): string {
  if (phone.startsWith('+222')) {
    const digits = phone.slice(4);
    return `+222 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
  }
  return phone;
}

export function getDayName(dayOfWeek: number): string {
  const t = i18n.t;
  const days: Record<number, string> = {
    0: t('days.sunday'),
    1: t('days.monday'),
    2: t('days.tuesday'),
    3: t('days.wednesday'),
    4: t('days.thursday'),
    5: t('days.friday'),
    6: t('days.saturday'),
  };
  return days[dayOfWeek] || '';
}
