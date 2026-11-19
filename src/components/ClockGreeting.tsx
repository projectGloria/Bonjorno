import { useClock } from '../hooks/useClock';
import type {
  BehaviorSettings,
  ClockStyle,
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
  editMode?: boolean;
  onUpdateBehavior?: (patch: Partial<BehaviorSettings>) => void;
  onUpdateLayout?: (patch: Partial<LayoutSettings>) => void;
}

const CLOCK_STYLES: ClockStyle[] = ['editorial', 'display', 'mono', 'minimal'];

export function ClockGreeting({
  behavior,
  layout,
  visibility,
  editMode = false,
  onUpdateBehavior,
  onUpdateLayout,
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

  const cycleClockStyle = () => {
    if (!onUpdateLayout) return;
    const idx = CLOCK_STYLES.indexOf(layout.clockStyle);
    const next = CLOCK_STYLES[(idx + 1) % CLOCK_STYLES.length];
    onUpdateLayout({ clockStyle: next });
  };

  return (
    <section
      className={`hero-block clock-style-${layout.clockStyle} greeting-style-${layout.greetingStyle} ${
        editMode ? 'is-edit-mode' : ''
      }`}
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
          {visibility.greeting &&
            (editMode && onUpdateBehavior ? (
              <input
                type="text"
                className="inline-greeting-input"
                value={behavior.customGreeting || behavior.userName}
                onChange={(e) => {
                  if (behavior.customGreeting) {
                    onUpdateBehavior({ customGreeting: e.target.value });
                  } else {
                    onUpdateBehavior({ userName: e.target.value });
                  }
                }}
                placeholder="Your name or greeting..."
                aria-label="Edit greeting name"
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <p className="greeting-text">{greetingText}</p>
            ))}
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

      {editMode && onUpdateBehavior && onUpdateLayout && (
        <div
          className="inline-edit-chips"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="mini-chip-btn"
            onClick={() =>
              onUpdateBehavior({ use24HourClock: !behavior.use24HourClock })
            }
          >
            {behavior.use24HourClock ? '24h' : '12h'}
          </button>
          <button
            type="button"
            className="mini-chip-btn"
            onClick={() =>
              onUpdateBehavior({ showSeconds: !behavior.showSeconds })
            }
          >
            {behavior.showSeconds ? 'Hide sec' : 'Show sec'}
          </button>
          <button
            type="button"
            className="mini-chip-btn"
            onClick={cycleClockStyle}
          >
            Style: {layout.clockStyle}
          </button>
        </div>
      )}
    </section>
  );
}
