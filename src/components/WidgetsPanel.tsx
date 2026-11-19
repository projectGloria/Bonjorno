import { useState } from 'react';
import type { TodoItem, WidgetId } from '../types/settings';
import { CheckIcon, GripIcon, PlusIcon, TrashIcon } from './Icons';

interface WidgetsPanelProps {
  showTodo: boolean;
  showNotes: boolean;
  widgetOrder: WidgetId[];
  todos: TodoItem[];
  notes: string;
  editMode?: boolean;
  onChangeTodos: (next: TodoItem[]) => void;
  onChangeNotes: (next: string) => void;
  onReorderWidgets: (next: WidgetId[]) => void;
}

const WIDGET_MIME = 'application/x-bonjorno-widget';
const TODO_MIME = 'application/x-bonjorno-todo';

export function WidgetsPanel({
  showTodo,
  showNotes,
  widgetOrder,
  todos,
  notes,
  editMode = false,
  onChangeTodos,
  onChangeNotes,
  onReorderWidgets,
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

  const visibleOrder = widgetOrder.filter((id) =>
    id === 'todo' ? showTodo : showNotes
  );

  const renderWidget = (id: WidgetId) => {
    const widgetDragProps = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData(WIDGET_MIME, id);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedWidget(id);
      },
      onDragOver: (e: React.DragEvent) => {
        if (!draggedWidget && !e.dataTransfer.types.includes(WIDGET_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        if (dragOverWidget !== id) setDragOverWidget(id);
      },
      onDragLeave: (e: React.DragEvent) => {
        e.stopPropagation();
        if (dragOverWidget === id) setDragOverWidget(null);
      },
      onDrop: (e: React.DragEvent) => {
        if (!draggedWidget && !e.dataTransfer.types.includes(WIDGET_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        handleWidgetDrop(id);
      },
      onDragEnd: (e: React.DragEvent) => {
        e.stopPropagation();
        setDraggedWidget(null);
        setDragOverWidget(null);
      },
    };

    const cardClass = `widget-card surface-card ${
      dragOverWidget === id ? 'is-drag-over' : ''
    } ${draggedWidget === id ? 'is-dragging' : ''} ${
      editMode ? 'is-editable-item' : ''
    }`;

    if (id === 'todo') {
      return (
        <div key="todo" className={cardClass} {...widgetDragProps}>
          <div className="widget-header">
            <div className="widget-title-group">
              <span className="drag-grip" title="Drag to swap widgets">
                <GripIcon size={14} />
              </span>
              <h3>Tasks</h3>
              <span className="widget-badge">{activeCount} left</span>
            </div>
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
        </div>
      );
    }

    return (
      <div key="notes" className={cardClass} {...widgetDragProps}>
        <div className="widget-header">
          <div className="widget-title-group">
            <span className="drag-grip" title="Drag to swap widgets">
              <GripIcon size={14} />
            </span>
            <h3>Notes</h3>
            <span className="widget-badge">Saved locally</span>
          </div>
          {notes.length > 0 && (
            <span className="notes-count">{notes.length} chars</span>
          )}
        </div>
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Jot down quick thoughts, links, or scratchpad notes..."
          aria-label="Scratchpad notes"
          maxLength={12000}
        />
      </div>
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
