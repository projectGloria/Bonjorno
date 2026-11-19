import { useState } from 'react';
import type { TodoItem } from '../types/settings';
import { CheckIcon, PlusIcon, TrashIcon } from './Icons';

interface WidgetsPanelProps {
  showTodo: boolean;
  showNotes: boolean;
  todos: TodoItem[];
  notes: string;
  onChangeTodos: (next: TodoItem[]) => void;
  onChangeNotes: (next: string) => void;
}

export function WidgetsPanel({
  showTodo,
  showNotes,
  todos,
  notes,
  onChangeTodos,
  onChangeNotes,
}: WidgetsPanelProps) {
  const [newTask, setNewTask] = useState('');

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

  return (
    <section
      className={`widgets-grid ${showTodo && showNotes ? 'two-col' : 'one-col'}`}
      aria-label="Productivity widgets"
    >
      {showTodo && (
        <div className="widget-card surface-card">
          <div className="widget-header">
            <div className="widget-title-group">
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

          <form className="todo-form" onSubmit={handleAddTask}>
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
                  className={`todo-item ${item.completed ? 'is-completed' : ''}`}
                >
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
      )}

      {showNotes && (
        <div className="widget-card surface-card">
          <div className="widget-header">
            <div className="widget-title-group">
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
            placeholder="Jot down quick thoughts, links, or scratchpad notes..."
            aria-label="Scratchpad notes"
            maxLength={12000}
          />
        </div>
      )}
    </section>
  );
}
