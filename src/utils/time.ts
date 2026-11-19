import type { DateFormat } from '../types/settings';

export function formatTimeParts(
  date: Date,
  use24Hour: boolean,
  showSeconds: boolean
): { main: string; seconds: string; period: string } {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = showSeconds ? String(date.getSeconds()).padStart(2, '0') : '';

  if (use24Hour) {
    const hours = String(hours24).padStart(2, '0');
    return {
      main: `${hours}:${minutes}`,
      seconds,
      period: '',
    };
  }

  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return {
    main: `${hours12}:${minutes}`,
    seconds,
    period,
  };
}

export function formatDateDisplay(date: Date, format: DateFormat): string {
  switch (format) {
    case 'long':
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(date);
    case 'short':
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    case 'numeric':
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    case 'iso': {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
}

export function getTimeBasedGreeting(
  date: Date,
  userName: string,
  customGreeting: string
): string {
  const trimmedCustom = customGreeting.trim();
  if (trimmedCustom) {
    return trimmedCustom;
  }

  const hour = date.getHours();
  let base: string;
  if (hour >= 5 && hour < 12) {
    base = 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    base = 'Good afternoon';
  } else if (hour >= 17 && hour < 22) {
    base = 'Good evening';
  } else {
    base = 'Good night';
  }

  const trimmedName = userName.trim();
  return trimmedName ? `${base}, ${trimmedName}` : base;
}
