import { useLayoutEffect, useRef, useState } from 'react';
import type { FreePosition } from '../types/settings';
import { GripIcon, MoveIcon, PinIcon } from './Icons';

export interface FreeMoveControlsProps {
  itemId: string;
  label: string;
  editMode: boolean;
  freePositions: Record<string, FreePosition>;
  snapToGrid: boolean;
  onSetPosition: (itemId: string, pos: FreePosition | null) => void;
  targetRef: React.RefObject<HTMLElement | null>;
  compact?: boolean;
}

export const FREE_POS_MAX = 96;

/**
 * Converts a raw percentage into a stored coordinate: optionally snapped to a
 * 2% grid, then clamped to [0, max]. `max` lets callers keep the element's
 * coordinate within the allowed range for its anchor.
 */
export function snapCoord(
  value: number,
  snap: boolean,
  max: number = FREE_POS_MAX
): number {
  const raw = snap ? Math.round(value / 2) * 2 : Number(value.toFixed(2));
  return Math.min(Math.max(0, max), Math.max(0, raw));
}

function fitToViewport(position: string, size: number): string {
  return `clamp(0px, ${position}, max(0px, calc(100% - ${size}px)))`;
}

const BODY_DRAG_THRESHOLD = 5;

// Legacy positions have no saved viewport size. Estimate their original width
// once so changes to the browser's reported screen size cannot shift the anchor.
const legacyViewportWidth = Math.max(window.screen.availWidth, document.documentElement.clientWidth, 1);

const NON_DRAG_SELECTOR =
  'button, input, textarea, select, option, label, [contenteditable="true"], [data-reorder-grip], [data-no-free-drag], .engine-dropdown, [draggable="true"]';

/** True when a pointerdown on an element body should start a free-move drag. */
function isBodyDragTarget(e: React.PointerEvent): boolean {
  if (e.button !== 0 || e.pointerType === 'touch') return false;
  const target = e.target as Element | null;
  if (!target || !(target instanceof Element)) return false;
  const blocker = target.closest(NON_DRAG_SELECTOR);
  // Ignore blockers outside this element (e.g. a draggable ancestor slot).
  return !blocker || !(e.currentTarget as Element).contains(blocker) || blocker === e.currentTarget;
}

/**
 * HTML5 drag-to-reorder is only enabled while the pointer is down on a grip
 * marked `data-reorder-grip` that belongs to this slot. Otherwise the slot is
 * not natively draggable, so grabbing its body free-moves it instead.
 */
export function useReorderArm() {
  const [armed, setArmed] = useState(false);
  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const grip = (e.target as Element).closest?.('[data-reorder-grip]');
    if (!grip || grip.closest('[data-drag-slot]') !== e.currentTarget) return;
    setArmed(true);
    const reset = () => {
      setArmed(false);
      window.removeEventListener('pointerup', reset);
      window.removeEventListener('dragend', reset, true);
    };
    window.addEventListener('pointerup', reset);
    window.addEventListener('dragend', reset, true);
  };
  return {
    'data-drag-slot': '',
    draggable: armed,
    onPointerDownCapture,
  } as const;
}

export function useFreeDrag({
  itemId,
  freePositions,
  snapToGrid,
  onSetPosition,
  targetRef,
}: {
  itemId: string;
  freePositions: Record<string, FreePosition>;
  snapToGrid: boolean;
  onSetPosition: (itemId: string, pos: FreePosition | null) => void;
  targetRef: React.RefObject<HTMLElement | null> | undefined;
}) {
  const [isFreeDragging, setIsFreeDragging] = useState(false);
  const livePosRef = useRef<FreePosition | null>(null);
  const [livePos, setLivePos] = useState<FreePosition | null>(null);

  const activePos = livePos ?? freePositions[itemId] ?? null;
  const isFree = activePos !== null;
  const [bounds, setBounds] = useState({ width: 0, height: 0, legacyOffset: 0 });

  useLayoutEffect(() => {
    const target = targetRef?.current;
    if (!isFree || !target) return;

    const measure = () => {
      const { offsetWidth: width, offsetHeight: height } = target;
      const layoutWidth = parseFloat(getComputedStyle(target).getPropertyValue('--free-layout-width'));
      const legacyOffset = ((layoutWidth || width) / 2 / legacyViewportWidth) * 100;
      setBounds((previous) => {
        if (previous.width === width && previous.height === height && previous.legacyOffset === legacyOffset) {
          return previous;
        }
        return { width, height, legacyOffset };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target, { box: 'border-box' });
    return () => observer.disconnect();
  }, [isFree, targetRef]);

  /**
   * Starts a free-move drag. With `threshold` > 0 the drag only begins once
   * the pointer has travelled that many pixels, so a plain click still works
   * (used when the element body itself is the drag surface).
   */
  const startPointerDrag = (
    e: React.PointerEvent,
    anchorEl: HTMLElement | null,
    threshold = 0
  ) => {
    if (e.button !== 0) return;
    if (threshold === 0) e.preventDefault();
    e.stopPropagation();

    const target = anchorEl ?? (e.currentTarget as HTMLElement);
    const rect = target.getBoundingClientRect();
    const vw = Math.max(document.documentElement.clientWidth, 1);
    const vh = Math.max(document.documentElement.clientHeight, 1);

    const initialX = ((rect.left + rect.width / 2) / vw) * 100;
    const initialY = (rect.top / vh) * 100;
    const maxY = Math.min(FREE_POS_MAX, 100 - (rect.height / vh) * 100);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let started = false;

    const begin = () => {
      started = true;
      window.getSelection()?.removeAllRanges();
      document.documentElement.classList.add('is-free-dragging');
      setIsFreeDragging(true);
      const startPos: FreePosition = {
        x: snapCoord(initialX, false, 100),
        y: snapCoord(initialY, false, maxY),
        anchor: 'center',
      };
      livePosRef.current = startPos;
      setLivePos(startPos);
    };

    if (threshold === 0) begin();

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startClientX;
      const dy = moveEvent.clientY - startClientY;
      if (!started) {
        if (Math.hypot(dx, dy) < threshold) return;
        begin();
      }
      moveEvent.preventDefault();
      const rawX = initialX + (dx / vw) * 100;
      const rawY = initialY + (dy / vh) * 100;
      const useSnap = snapToGrid && !moveEvent.altKey;
      const next: FreePosition = {
        x: snapCoord(rawX, useSnap, 100),
        y: snapCoord(rawY, useSnap, maxY),
        anchor: 'center',
      };
      livePosRef.current = next;
      setLivePos(next);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (!started) return;
      document.documentElement.classList.remove('is-free-dragging');
      setIsFreeDragging(false);
      if (livePosRef.current) {
        onSetPosition(itemId, livePosRef.current);
      }
      livePosRef.current = null;
      setLivePos(null);
      // Swallow the click that follows a drag so links/edit dialogs don't open.
      const swallow = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(
        () => window.removeEventListener('click', swallow, { capture: true }),
        0
      );
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  /**
   * Edit-mode handler for the element body: press anywhere on the element
   * and move to drag it. Controls (buttons, inputs, grips) keep working.
   */
  const bodyPointerDown = (
    e: React.PointerEvent,
    anchorEl: HTMLElement | null
  ) => {
    if (!isBodyDragTarget(e)) return;
    startPointerDrag(e, anchorEl, BODY_DRAG_THRESHOLD);
  };

  const dockItem = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onSetPosition(itemId, null);
  };

  const halfWidth = bounds.width / 2;
  const freeStyle: React.CSSProperties | undefined = activePos
    ? {
        position: 'fixed',
        left: fitToViewport(
          `calc(${activePos.x + (activePos.anchor === 'center' ? 0 : bounds.legacyOffset)}% - ${halfWidth}px)`,
          bounds.width
        ),
        top: fitToViewport(`${activePos.y}%`, bounds.height),
        maxWidth: '100%',
        zIndex: isFreeDragging ? 55 : 28,
      }
    : undefined;

  return {
    isFree,
    isFreeDragging,
    activePos,
    freeStyle,
    startPointerDrag,
    bodyPointerDown,
    dockItem,
  };
}

export function FreeMoveBadge({
  label,
  isFree,
  activePos,
  onStartFreeDrag,
  onDock,
  compact = false,
}: {
  label: string;
  isFree: boolean;
  activePos: FreePosition | null;
  onStartFreeDrag: (e: React.PointerEvent) => void;
  onDock: (e: React.MouseEvent) => void;
  compact?: boolean;
}) {
  return (
    <span
      className={`free-move-controls ${compact ? 'is-compact' : ''} ${
        isFree ? 'is-floating' : ''
      }`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="free-move-handle"
        onPointerDown={onStartFreeDrag}
        title={`Drag "${label}" freely anywhere on screen (hold Alt to bypass grid snap)`}
        aria-label={`Free-move ${label} anywhere on screen`}
      >
        <MoveIcon size={compact ? 11 : 12} />
        {!compact && (
          <span>
            {isFree && activePos
              ? `${Math.round(activePos.x)}%, ${Math.round(activePos.y)}%`
              : 'Free Move'}
          </span>
        )}
      </button>
      {isFree && (
        <button
          type="button"
          className="free-dock-btn"
          onClick={onDock}
          title={`Dock "${label}" back into layout slot`}
          aria-label={`Dock ${label} back to slot`}
        >
          <PinIcon size={compact ? 11 : 12} />
          {!compact && <span>Dock</span>}
        </button>
      )}
    </span>
  );
}

export { GripIcon };
