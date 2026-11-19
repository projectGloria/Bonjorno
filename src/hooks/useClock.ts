import { useEffect, useState } from 'react';

/**
 * Drift-free clock hook that ticks on exact second or minute boundaries.
 */
export function useClock(showSeconds: boolean): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: number;

    const scheduleNext = () => {
      const current = new Date();
      setNow(current);
      const delay = showSeconds
        ? 1000 - current.getMilliseconds() + 15
        : (60 - current.getSeconds()) * 1000 - current.getMilliseconds() + 30;
      timeoutId = window.setTimeout(scheduleNext, Math.max(100, delay));
    };

    scheduleNext();
    return () => window.clearTimeout(timeoutId);
  }, [showSeconds]);

  return now;
}
