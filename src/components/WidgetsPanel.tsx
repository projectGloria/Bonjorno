import { useRef, useState } from 'react';
import type { FreePosition, LayoutSettings, TodoItem, WidgetId } from '../types/settings';
import { FreeMoveBadge, useFreeDrag, useReorderArm } from './FreeMoveSlot';
import { CheckIcon, GripIcon, PlusIcon, TrashIcon } from './Icons';

interface WidgetsPanelProps {
  showTodo: boolean;
  showNotes: boolean;
  widgetOrder: WidgetId[];
  layout: LayoutSettings;
  todos: TodoItem[];
  notes: string;
  editMode?: boolean;
  onChangeTodos: (next: TodoItem[]) => void;
  onChangeNotes: (next: string) => void;
  onReorderWidgets: (next: WidgetId[]) => void;
  onSetFreePosition?: (itemId: string, pos: FreePosition | null) => void;
}

const WIDGET_MIME = 'application/x-bonjorno-widget';
const TODO_MIME = 'application/x-bonjorno-todo';

const WIDGET_LABELS: Record<WidgetId, string> = {
  todo: 'Tasks Widget',
  notes: 'Notes Widget',
};

function WidgetSlot({
  id,
  editMode,
  layout,
  draggedWidget,
  dragOverWidget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onSetFreePosition,
  renderHeaderExtra,
  children,
}: {
  id: WidgetId;
  editMode: boolean;
  layout: LayoutSettings;
  draggedWidget: WidgetId | null;
  dragOverWidget: WidgetId | null;
  onDragStart: (id: WidgetId) => void;
  onDragOver: (id: WidgetId) => void;
  onDragLeave: (id: WidgetId) => void;
  onDrop: (id: WidgetId) => void;
  onDragEnd: () => void;
  onSetFreePosition: (itemId: string, pos: FreePosition | null) => void;
  renderHeaderExtra: (freeControls: React.ReactNode) => React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const itemId = `widget:${id}`;
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

  const cardClass = `widget-card surface-card ${
    dragOverWidget === id ? 'is-drag-over' : ''
  } ${draggedWidget === id || isFreeDragging ? 'is-dragging' : ''} ${
    editMode ? 'is-editable-item' : ''
  } ${isFree ? 'is-free-placed' : ''}`;

  const freeBadge = editMode ? (
    <FreeMoveBadge
      label={WIDGET_LABELS[id]}
      isFree={isFree}
      activePos={activePos}
      onStartFreeDrag={(e) => startPointerDrag(e, ref.current)}
      onDock={dockItem}
      compact
    />
  ) : null;

  return (
    <div
      ref={ref}
      style={freeStyle}
      className={cardClass}
      {...reorder}
      onPointerDown={
        editMode ? (e) => bodyPointerDown(e, ref.current) : undefined
      }
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(WIDGET_MIME, id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(id);
      }}
      onDragOver={(e) => {
        if (!draggedWidget && !e.dataTransfer.types.includes(WIDGET_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        onDragOver(id);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave(id);
      }}
      onDrop={(e) => {
        if (!draggedWidget && !e.dataTransfer.types.includes(WIDGET_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        onDrop(id);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEnd();
      }}
    >
      {renderHeaderExtra(freeBadge)}
      {children}
    </div>
  );
}

export function WidgetsPanel({
  showTodo,
  showNotes,
  widgetOrder,
  layout,
  todos,
  notes,
  editMode = false,
  onChangeTodos,
  onChangeNotes,
  onReorderWidgets,
  onSetFreePosition,
}: WidgetsPanelProps) {
  const [newTask, setNewTask] = useState('');
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<WidgetId | null>(null);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);

  if (!showTodo && !showNotes) return null;

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.length - activeCount;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newTask.trim();
    if (!text) return;
    onChangeTodos([
      {
        id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text,
        completed: false,
        createdAt: Date.now(),
      },
      ...todos,
    ]);
    setNewTask('');
  };

  const toggleTodo = (id: string) => {
    onChangeTodos(
      todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = (id: string) => {
    onChangeTodos(todos.filter((t) => t.id !== id));
  };

  const clearCompleted = () => {
    onChangeTodos(todos.filter((t) => !t.completed));
  };

  const handleTodoDrop = (targetId: string) => {
    if (!draggedTodoId || draggedTodoId === targetId) {
      setDraggedTodoId(null);
      setDragOverTodoId(null);
      return;
    }
    const fromIdx = todos.findIndex((t) => t.id === draggedTodoId);
    const toIdx = todos.findIndex((t) => t.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const next = [...todos];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChangeTodos(next);
    setDraggedTodoId(null);
    setDragOverTodoId(null);
  };

  const handleWidgetDrop = (targetId: WidgetId) => {
    if (!draggedWidget || draggedWidget === targetId) {
      setDraggedWidget(null);
      setDragOverWidget(null);
      return;
    }
    const fromIdx = widgetOrder.indexOf(draggedWidget);
    const toIdx = widgetOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const next = [...widgetOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onReorderWidgets(next);
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const handleSetFreePos = (itemId: string, pos: FreePosition | null) => {
    if (onSetFreePosition) {
      onSetFreePosition(itemId, pos);
    }
  };

  const visibleOrder = widgetOrder.filter((id) =>
    id === 'todo' ? showTodo : showNotes
  );

  const renderWidget = (id: WidgetId) => {
    const slotProps = {
      id,
      editMode,
      layout,
      draggedWidget,
      dragOverWidget,
      onDragStart: (wId: WidgetId) => setDraggedWidget(wId),
      onDragOver: (wId: WidgetId) => {
        if (dragOverWidget !== wId) setDragOverWidget(wId);
      },
      onDragLeave: (wId: WidgetId) => {
        if (dragOverWidget === wId) setDragOverWidget(null);
      },
      onDrop: handleWidgetDrop,
      onDragEnd: () => {
        setDraggedWidget(null);
        setDragOverWidget(null);
      },
      onSetFreePosition: handleSetFreePos,
    };

    if (id === 'todo') {
      return (
        <WidgetSlot
          key="todo"
          {...slotProps}
          renderHeaderExtra={(freeBadge) => (
            <div className="widget-header">
              <div className="widget-title-group">
                <span data-reorder-grip className="drag-grip" title="Drag to swap widgets">
                  <GripIcon size={14} />
                </span>
                <h3>Tasks</h3>
                <span className="widget-badge">{activeCount} left</span>
              </div>
              <div className="widget-header-right">
                {freeBadge}
                {completedCount > 0 && (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={clearCompleted}
                  >
                    Clear done
                  </button>
                )}
              </div>
            </div>
          )}
        >
          <form
            className="todo-form"
            onSubmit={handleAddTask}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              className="todo-input"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task..."
              maxLength={200}
              aria-label="New task"
            />
            <button
              type="submit"
              className="icon-btn"
              disabled={!newTask.trim()}
              aria-label="Add task"
            >
              <PlusIcon size={16} />
            </button>
          </form>

          <ul className="todo-list">
            {todos.length === 0 ? (
              <li className="widget-empty">Nothing on your list yet.</li>
            ) : (
              todos.map((item) => (
                <li
                  key={item.id}
                  className={`todo-item ${item.completed ? 'is-completed' : ''} ${
                    dragOverTodoId === item.id ? 'is-drag-over' : ''
                  } ${draggedTodoId === item.id ? 'is-dragging' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData(TODO_MIME, item.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedTodoId(item.id);
                  }}
                  onDragOver={(e) => {
                    if (!draggedTodoId && !e.dataTransfer.types.includes(TODO_MIME)) {
                      return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragOverTodoId !== item.id) setDragOverTodoId(item.id);
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    if (dragOverTodoId === item.id) setDragOverTodoId(null);
                  }}
                  onDrop={(e) => {
                    if (!draggedTodoId && !e.dataTransfer.types.includes(TODO_MIME)) {
                      return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    handleTodoDrop(item.id);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    setDraggedTodoId(null);
                    setDragOverTodoId(null);
                  }}
                >
                  <span className="drag-grip todo-grip" aria-hidden="true">
                    <GripIcon size={12} />
                  </span>
                  <button
                    type="button"
                    className="todo-check"
                    onClick={() => toggleTodo(item.id)}
                    aria-pressed={item.completed}
                    aria-label={
                      item.completed
                        ? `Mark "${item.text}" incomplete`
                        : `Mark "${item.text}" complete`
                    }
                  >
                    {item.completed && <CheckIcon size={12} />}
                  </button>
                  <span className="todo-text">{item.text}</span>
                  <button
                    type="button"
                    className="icon-btn-tiny danger todo-delete"
                    onClick={() => deleteTodo(item.id)}
                    aria-label={`Delete "${item.text}"`}
                  >
                    <TrashIcon size={12} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </WidgetSlot>
      );
    }

    return (
      <WidgetSlot
        key="notes"
        {...slotProps}
        renderHeaderExtra={(freeBadge) => (
          <div className="widget-header">
            <div className="widget-title-group">
              <span data-reorder-grip className="drag-grip" title="Drag to swap widgets">
                <GripIcon size={14} />
              </span>
              <h3>Notes</h3>
              <span className="widget-badge">Saved locally</span>
            </div>
            <div className="widget-header-right">
              {freeBadge}
              {notes.length > 0 && (
                <span className="notes-count">{notes.length} chars</span>
              )}
            </div>
          </div>
        )}
      >
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Jot down quick thoughts, links, or scratchpad notes..."
          aria-label="Scratchpad notes"
          maxLength={12000}
        />
      </WidgetSlot>
    );
  };

  return (
    <section
      className={`widgets-grid ${visibleOrder.length > 1 ? 'two-col' : 'one-col'}`}
      aria-label="Productivity widgets"
    >
      {visibleOrder.map(renderWidget)}
    </section>
  );
}
