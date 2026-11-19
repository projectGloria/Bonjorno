import { SEARCH_ENGINES } from '../constants/defaults';
import type { BuiltinSearchEngineId } from '../types/settings';

const BLOCKED_PROTOCOLS = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
]);

export function normalizeAndValidateUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const isLocalhostPort = /^localhost(:\d+)?(\/|$)/i.test(trimmed);
  const hasScheme = !isLocalhostPort && /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme
    ? trimmed
    : isLocalhostPort
      ? `http://${trimmed}`
      : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (BLOCKED_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      // Allow localhost explicitly
      if (parsed.hostname !== 'localhost') {
        return null;
      }
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function looksLikeDirectUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeAndValidateUrl(trimmed) !== null;
  }
  // e.g. github.com, docs.rs/serde, localhost:3000
  if (/^(localhost(:\d+)?|[a-z0-9-]+(\.[a-z0-9-]+)+)(:\d+)?(\/\S*)?$/i.test(trimmed)) {
    return normalizeAndValidateUrl(trimmed) !== null;
  }
  return false;
}

export function buildSearchUrl(
  query: string,
  engineId: BuiltinSearchEngineId,
  customTemplate?: string
): string {
  const encoded = encodeURIComponent(query.trim());

  if (engineId === 'custom' && customTemplate) {
    const trimmed = customTemplate.trim();
    if (trimmed.includes('%s')) {
      return trimmed.replace(/%s/g, encoded);
    }
    const valid = normalizeAndValidateUrl(trimmed);
    if (valid) {
      return `${valid}${valid.includes('?') ? '&' : '?'}q=${encoded}`;
    }
  }

  const engine =
    SEARCH_ENGINES.find((e) => e.id === engineId) ?? SEARCH_ENGINES[0];
  return engine.urlTemplate.replace('%s', encoded);
}

export function extractDomainLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    return host;
  } catch {
    return url;
  }
}

export function getMonogram(title: string, url: string): string {
  const cleanTitle = title.trim();
  if (cleanTitle) {
    const words = cleanTitle.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return cleanTitle.slice(0, 2).toUpperCase();
  }
  const domain = extractDomainLabel(url);
  return domain.slice(0, 2).toUpperCase() || '?';
}

const MONOGRAM_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
];

export function getMonogramColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return MONOGRAM_PALETTE[hash % MONOGRAM_PALETTE.length];
}
