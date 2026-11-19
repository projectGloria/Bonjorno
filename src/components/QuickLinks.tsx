import { useState } from 'react';
import type { LayoutSettings, QuickLink } from '../types/settings';
import { extractDomainLabel, normalizeAndValidateUrl } from '../utils/url';
import { FaviconBadge } from './FaviconBadge';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from './Icons';

interface QuickLinksProps {
  links: QuickLink[];
  layout: LayoutSettings;
  openInNewTab: boolean;
  editMode: boolean;
  onToggleEditMode: () => void;
  onChange: (next: QuickLink[]) => void;
}

interface LinkDraft {
  id: string | null;
  title: string;
  url: string;
}

const LINK_MIME = 'application/x-bonjorno-link';

export function QuickLinks({
  links,
  layout,
  openInNewTab,
  editMode,
  onToggleEditMode,
  onChange,
}: QuickLinksProps) {
  const [draft, setDraft] = useState<LinkDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const openAddModal = () => {
    setFormError(null);
    setDraft({ id: null, title: '', url: '' });
  };

  const openEditModal = (link: QuickLink) => {
    setFormError(null);
    setDraft({ id: link.id, title: link.title, url: link.url });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    const validUrl = normalizeAndValidateUrl(draft.url);
    if (!validUrl) {
      setFormError('Please enter a valid web address (e.g. https://brave.com).');
      return;
    }

    const title = draft.title.trim() || extractDomainLabel(validUrl);

    if (draft.id) {
      onChange(
        links.map((item) =>
          item.id === draft.id ? { ...item, title, url: validUrl } : item
        )
      );
    } else {
      const newLink: QuickLink = {
        id: `ql-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        url: validUrl,
      };
      onChange([...links, newLink]);
    }

    setDraft(null);
    setFormError(null);
  };

  const handleDelete = (id: string) => {
    onChange(links.filter((item) => item.id !== id));
  };

  const moveLink = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const fromIdx = links.findIndex((l) => l.id === draggedId);
    const toIdx = links.findIndex((l) => l.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const next = [...links];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChange(next);
    setDraggedId(null);
    setDragOverId(null);
  };

  const linkTargetProps = openInNewTab
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <section
      className={`quicklinks-section ${links.length === 0 ? 'is-empty' : ''} ${
        editMode ? 'is-edit-mode' : ''
      }`}
      aria-label="Quick links"
    >
      <div
        className={`quicklinks-container layout-${layout.quickLinkLayout}`}
        style={
          layout.quickLinkLayout === 'grid'
            ? ({ '--ql-cols': layout.quickLinkColumns } as React.CSSProperties)
            : undefined
        }
      >
        {links.map((link, idx) => (
          <div
            key={link.id}
            className={`quicklink-item surface-card ${
              dragOverId === link.id ? 'is-drag-over' : ''
            } ${draggedId === link.id ? 'is-dragging' : ''} ${
              editMode ? 'is-editable-item' : ''
            }`}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData(LINK_MIME, link.id);
              e.dataTransfer.effectAllowed = 'move';
              setDraggedId(link.id);
            }}
            onDragOver={(e) => {
              if (!draggedId && !e.dataTransfer.types.includes(LINK_MIME)) return;
              e.preventDefault();
              e.stopPropagation();
              if (dragOverId !== link.id) setDragOverId(link.id);
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              if (dragOverId === link.id) setDragOverId(null);
            }}
            onDrop={(e) => {
              if (!draggedId && !e.dataTransfer.types.includes(LINK_MIME)) return;
              e.preventDefault();
              e.stopPropagation();
              handleDrop(link.id);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              setDraggedId(null);
              setDragOverId(null);
            }}
          >
            <a
              href={link.url}
              className="quicklink-anchor"
              title={
                editMode
                  ? `Click to edit ${link.title} or drag to reorder`
                  : `${link.title} — ${extractDomainLabel(link.url)}`
              }
              onClick={(e) => {
                if (editMode) {
                  e.preventDefault();
                  openEditModal(link);
                }
              }}
              draggable={false}
              {...linkTargetProps}
            >
              <FaviconBadge
                url={link.url}
                title={link.title}
                size={layout.quickLinkLayout === 'compact' ? 20 : 30}
              />
              <span className="quicklink-text">
                <span className="quicklink-title">{link.title}</span>
                {layout.quickLinkLayout === 'list' && (
                  <span className="quicklink-domain">
                    {extractDomainLabel(link.url)}
                  </span>
                )}
              </span>
            </a>

            {editMode && (
              <div
                className="quicklink-actions is-visible"
                aria-label={`Manage ${link.title}`}
              >
                <button
                  type="button"
                  className="icon-btn-tiny"
                  onClick={() => moveLink(idx, -1)}
                  disabled={idx === 0}
                  title="Move earlier"
                  aria-label={`Move ${link.title} earlier`}
                >
                  <ArrowUpIcon size={12} />
                </button>
                <button
                  type="button"
                  className="icon-btn-tiny"
                  onClick={() => moveLink(idx, 1)}
                  disabled={idx === links.length - 1}
                  title="Move later"
                  aria-label={`Move ${link.title} later`}
                >
                  <ArrowDownIcon size={12} />
                </button>
                <button
                  type="button"
                  className="icon-btn-tiny"
                  onClick={() => openEditModal(link)}
                  title="Edit shortcut"
                  aria-label={`Edit ${link.title}`}
                >
                  <EditIcon size={12} />
                </button>
                <button
                  type="button"
                  className="icon-btn-tiny danger"
                  onClick={() => handleDelete(link.id)}
                  title="Delete shortcut"
                  aria-label={`Delete ${link.title}`}
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="quicklink-add-row">
        <button
          type="button"
          className="quicklink-add-btn surface-card"
          onClick={openAddModal}
          aria-label="Add shortcut"
        >
          <PlusIcon size={15} />
          <span className="quicklink-add-label">Add link</span>
        </button>

        <button
          type="button"
          className={`quicklink-add-btn surface-card ${
            editMode ? 'is-edit-active' : ''
          }`}
          onClick={onToggleEditMode}
          aria-pressed={editMode}
          aria-label={editMode ? 'Finish editing layout' : 'Edit layout and items'}
        >
          {editMode ? <CheckIcon size={14} /> : <EditIcon size={14} />}
          <span className="quicklink-add-label">
            {editMode ? 'Done' : 'Edit'}
          </span>
        </button>
      </div>

      {draft && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quicklink-modal-title"
          onClick={() => setDraft(null)}
        >
          <div
            className="modal-card surface-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="quicklink-modal-title">
                {draft.id ? 'Edit Shortcut' : 'Add Shortcut'}
              </h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setDraft(null)}
                aria-label="Close dialog"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              <label className="field-group">
                <span className="field-label">Name</span>
                <input
                  type="text"
                  className="text-input"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  placeholder="e.g. Brave Search"
                  maxLength={60}
                  autoFocus
                />
              </label>

              <label className="field-group">
                <span className="field-label">URL</span>
                <input
                  type="text"
                  className="text-input"
                  value={draft.url}
                  onChange={(e) => {
                    setDraft({ ...draft, url: e.target.value });
                    if (formError) setFormError(null);
                  }}
                  placeholder="https://search.brave.com"
                  required
                />
              </label>

              {formError && (
                <p className="field-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {draft.id ? 'Save Changes' : 'Add Shortcut'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
