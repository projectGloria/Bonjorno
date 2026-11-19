import { useEffect, useRef, useState } from 'react';
import { SEARCH_ENGINES } from '../constants/defaults';
import type {
  BehaviorSettings,
  BuiltinSearchEngineId,
} from '../types/settings';
import {
  buildSearchUrl,
  looksLikeDirectUrl,
  normalizeAndValidateUrl,
} from '../utils/url';
import { CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon } from './Icons';

interface SearchBarProps {
  behavior: BehaviorSettings;
  onSelectEngine: (engineId: BuiltinSearchEngineId) => void;
}

export function SearchBar({ behavior, onSelectEngine }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Optional auto-focus on mount
  useEffect(() => {
    if (behavior.autoFocusSearch) {
      inputRef.current?.focus();
    }
  }, [behavior.autoFocusSearch]);

  // Global "/" shortcut to focus search when not typing in another field
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close engine menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  const activeEngine =
    behavior.searchEngine === 'custom'
      ? {
          id: 'custom' as const,
          name: behavior.customSearchName.trim() || 'Custom',
          shortName: behavior.customSearchName.trim() || 'Custom',
          placeholder: `Search with ${behavior.customSearchName.trim() || 'Custom'}...`,
        }
      : SEARCH_ENGINES.find((e) => e.id === behavior.searchEngine) ??
        SEARCH_ENGINES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    let destination: string;
    if (looksLikeDirectUrl(trimmed)) {
      destination =
        normalizeAndValidateUrl(trimmed) ??
        buildSearchUrl(trimmed, behavior.searchEngine, behavior.customSearchUrl);
    } else {
      destination = buildSearchUrl(
        trimmed,
        behavior.searchEngine,
        behavior.customSearchUrl
      );
    }

    if (behavior.openLinksInNewTab) {
      window.open(destination, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(destination);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (menuOpen) {
        setMenuOpen(false);
      } else if (query) {
        setQuery('');
      } else {
        inputRef.current?.blur();
      }
    }
  };

  const engineOptions = [
    ...SEARCH_ENGINES.map((e) => ({ id: e.id, name: e.name })),
    {
      id: 'custom' as const,
      name: behavior.customSearchName.trim()
        ? `${behavior.customSearchName.trim()} (Custom)`
        : 'Custom Engine',
    },
  ];

  return (
    <section className="search-section" aria-label="Search">
      <div className="search-container" ref={containerRef}>
        <form className="search-form surface-card" onSubmit={handleSubmit} role="search">
          <button
            type="button"
            className="engine-trigger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            aria-label={`Search engine: ${activeEngine.name}. Click to change.`}
            title={`Search engine: ${activeEngine.name}`}
          >
            <span className="engine-pill-label">{activeEngine.shortName}</span>
            <ChevronDownIcon size={13} />
          </button>

          <span className="search-divider" aria-hidden="true" />

          <input
            ref={inputRef}
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={activeEngine.placeholder}
            aria-label="Search query or URL"
            autoComplete="off"
            spellCheck={false}
          />

          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <CloseIcon size={15} />
            </button>
          )}

          <button
            type="submit"
            className="search-submit-btn"
            aria-label="Submit search"
            disabled={!query.trim()}
          >
            <SearchIcon size={17} />
          </button>
        </form>

        {menuOpen && (
          <div
            className="engine-dropdown surface-popover"
            role="listbox"
            aria-label="Select search engine"
          >
            {engineOptions.map((engine) => {
              const selected = engine.id === behavior.searchEngine;
              return (
                <button
                  key={engine.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`engine-option ${selected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onSelectEngine(engine.id);
                    setMenuOpen(false);
                    inputRef.current?.focus();
                  }}
                >
                  <span>{engine.name}</span>
                  {selected && <CheckIcon size={14} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
