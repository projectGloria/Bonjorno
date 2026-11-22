import { useRef, useState } from 'react';
import { useClock } from '../hooks/useClock';
import type {
  BehaviorSettings,
  ClockStyle,
  FreePosition,
  HeroPartId,
  LayoutSettings,
  VisibilitySettings,
} from '../types/settings';
import {
  formatDateDisplay,
  formatTimeParts,
  getTimeBasedGreeting,
} from '../utils/time';
import { FreeMoveBadge, useFreeDrag, useReorderArm } from './FreeMoveSlot';
import { GripIcon } from './Icons';

interface ClockGreetingProps {
  behavior: BehaviorSettings;
  layout: LayoutSettings;
  visibility: VisibilitySettings;
  editMode?: boolean;
  onUpdateBehavior?: (patch: Partial<BehaviorSettings>) => void;
  onUpdateLayout?: (patch: Partial<LayoutSettings>) => void;
  onSetFreePosition?: (itemId: string, pos: FreePosition | null) => void;
}

const CLOCK_STYLES: ClockStyle[] = ['editorial', 'display', 'mono', 'minimal'];
const HERO_PART_MIME = 'application/x-bonjorno-hero-part';

const HERO_PART_LABELS: Record<HeroPartId, string> = {
  clock: 'Clock',
  greeting: 'Greeting',
  date: 'Date',
};

function HeroPartItem({
  partId,
  editMode,
  layout,
  draggedPart,
  dragOverPart,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onSetFreePosition,
  children,
}: {
  partId: HeroPartId;
  editMode: boolean;
  layout: LayoutSettings;
  draggedPart: HeroPartId | null;
  dragOverPart: HeroPartId | null;
  onDragStart: (id: HeroPartId) => void;
  onDragOver: (id: HeroPartId) => void;
  onDragLeave: (id: HeroPartId) => void;
  onDrop: (id: HeroPartId) => void;
  onDragEnd: () => void;
  onSetFreePosition: (itemId: string, pos: FreePosition | null) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const itemId = `hero:${partId}`;
  const {
    isFree,
    isFreeDragging,
    activePos,
    freeStyle,
    startPointerDrag,
    bodyPointerDown,
    dockItem,
  } = useFreeDrag({
    itemId,
    targetRef: ref,
    freePositions: layout.freePositions,
    snapToGrid: layout.snapToGrid,
    onSetPosition: onSetFreePosition,
  });
  const reorder = useReorderArm();

  return (
    <div
      ref={ref}
      style={freeStyle}
      className={`hero-part-slot hero-part-${partId} ${
        editMode ? 'is-editable-part' : ''
      } ${dragOverPart === partId ? 'is-drag-over' : ''} ${
        draggedPart === partId || isFreeDragging ? 'is-dragging' : ''
      } ${isFree ? 'is-free-placed' : ''}`}
      {...reorder}
      onPointerDown={
        editMode ? (e) => bodyPointerDown(e, ref.current) : undefined
      }
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(HERO_PART_MIME, partId);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(partId);
      }}
      onDragOver={(e) => {
        if (!draggedPart && !e.dataTransfer.types.includes(HERO_PART_MIME)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onDragOver(partId);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave(partId);
      }}
      onDrop={(e) => {
        if (!draggedPart && !e.dataTransfer.types.includes(HERO_PART_MIME)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onDrop(partId);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEnd();
      }}
    >
      {editMode && (
        <div className="part-mini-toolbar">
          <span data-reorder-grip className="part-mini-grip" title={`Drag to reorder ${HERO_PART_LABELS[partId]}`}>
            <GripIcon size={11} />
            <span>{HERO_PART_LABELS[partId]}</span>
          </span>
          <FreeMoveBadge
            label={HERO_PART_LABELS[partId]}
            isFree={isFree}
            activePos={activePos}
            onStartFreeDrag={(e) => startPointerDrag(e, ref.current)}
            onDock={dockItem}
            compact
          />
        </div>
      )}
      {children}
    </div>
  );
}

export function ClockGreeting({
  behavior,
  layout,
  visibility,
  editMode = false,
  onUpdateBehavior,
  onUpdateLayout,
  onSetFreePosition,
}: ClockGreetingProps) {
  const now = useClock(behavior.showSeconds);
  const [draggedPart, setDraggedPart] = useState<HeroPartId | null>(null);
  const [dragOverPart, setDragOverPart] = useState<HeroPartId | null>(null);

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

  const handlePartDrop = (targetId: HeroPartId) => {
    if (!draggedPart || draggedPart === targetId || !onUpdateLayout) {
      setDraggedPart(null);
      setDragOverPart(null);
      return;
    }
    const order = [...layout.heroOrder];
    const fromIdx = order.indexOf(draggedPart);
    const toIdx = order.indexOf(targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      const [moved] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, moved);
      onUpdateLayout({ heroOrder: order });
    }
    setDraggedPart(null);
    setDragOverPart(null);
  };

  const handleSetFreePos = (itemId: string, pos: FreePosition | null) => {
    if (onSetFreePosition) {
      onSetFreePosition(itemId, pos);
    }
  };

  const visibleParts = layout.heroOrder.filter((p) => visibility[p]);

  const renderPartContent = (partId: HeroPartId) => {
    if (partId === 'clock') {
      return (
        <time className="clock-display" dateTime={now.toISOString()}>
          <span className="clock-main">{time.main}</span>
          {time.seconds && <span className="clock-seconds">:{time.seconds}</span>}
          {time.period && <span className="clock-period">{time.period}</span>}
        </time>
      );
    }
    if (partId === 'greeting') {
      return (
        <>
          <p className="greeting-text">{greetingText}</p>
          {editMode && onUpdateBehavior && (
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
          )}
        </>
      );
    }
    return <p className="date-text">{dateText}</p>;
  };

  return (
    <section
      className={`hero-block clock-style-${layout.clockStyle} greeting-style-${layout.greetingStyle} ${
        editMode ? 'is-edit-mode' : ''
      }`}
      aria-label="Clock and greeting"
    >
      <div className="hero-parts-list">
        {visibleParts.map((partId) => (
          <HeroPartItem
            key={partId}
            partId={partId}
            editMode={editMode}
            layout={layout}
            draggedPart={draggedPart}
            dragOverPart={dragOverPart}
            onDragStart={(id) => setDraggedPart(id)}
            onDragOver={(id) => {
              if (dragOverPart !== id) setDragOverPart(id);
            }}
            onDragLeave={(id) => {
              if (dragOverPart === id) setDragOverPart(null);
            }}
            onDrop={handlePartDrop}
            onDragEnd={() => {
              setDraggedPart(null);
              setDragOverPart(null);
            }}
            onSetFreePosition={handleSetFreePos}
          >
            {renderPartContent(partId)}
          </HeroPartItem>
        ))}
      </div>

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
