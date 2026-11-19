import { useClock } from '../hooks/useClock';
import type {
  BehaviorSettings,
  LayoutSettings,
  VisibilitySettings,
} from '../types/settings';
import {
  formatDateDisplay,
  formatTimeParts,
  getTimeBasedGreeting,
} from '../utils/time';

interface ClockGreetingProps {
  behavior: BehaviorSettings;
  layout: LayoutSettings;
  visibility: VisibilitySettings;
}

export function ClockGreeting({
  behavior,
  layout,
  visibility,
}: ClockGreetingProps) {
  const now = useClock(behavior.showSeconds);

  if (!visibility.clock && !visibility.date && !visibility.greeting) {
    return null;
  }

  const time = formatTimeParts(now, behavior.use24HourClock, behavior.showSeconds);
  const dateText = formatDateDisplay(now, behavior.dateFormat);
  const greetingText = getTimeBasedGreeting(
    now,
    behavior.userName,
    behavior.customGreeting
  );

  return (
    <section
      className={`hero-block clock-style-${layout.clockStyle} greeting-style-${layout.greetingStyle}`}
      aria-label="Clock and greeting"
    >
      {visibility.clock && (
        <time className="clock-display" dateTime={now.toISOString()}>
          <span className="clock-main">{time.main}</span>
          {time.seconds && <span className="clock-seconds">:{time.seconds}</span>}
          {time.period && <span className="clock-period">{time.period}</span>}
        </time>
      )}

      {(visibility.date || visibility.greeting) && (
        <div className="hero-meta">
          {visibility.greeting && (
            <p className="greeting-text">{greetingText}</p>
          )}
          {visibility.greeting &&
            visibility.date &&
            layout.greetingStyle === 'inline' && (
              <span className="meta-dot" aria-hidden="true">
                ·
              </span>
            )}
          {visibility.date && <p className="date-text">{dateText}</p>}
        </div>
      )}
    </section>
  );
}
