import { describe, expect, it } from 'vitest';
import {
  buildSearchUrl,
  getMonogram,
  looksLikeDirectUrl,
  normalizeAndValidateUrl,
} from '../src/utils/url';

describe('URL validation and search helpers', () => {
  it('normalizes valid URLs and rejects unsafe schemes', () => {
    expect(normalizeAndValidateUrl('brave.com')).toBe('https://brave.com/');
    expect(normalizeAndValidateUrl('https://github.com/brave')).toBe(
      'https://github.com/brave'
    );
    expect(normalizeAndValidateUrl('http://localhost:3000/test')).toBe(
      'http://localhost:3000/test'
    );
    expect(normalizeAndValidateUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeAndValidateUrl('data:text/html,hi')).toBeNull();
    expect(normalizeAndValidateUrl('not a url')).toBeNull();
  });

  it('detects direct URLs vs search queries', () => {
    expect(looksLikeDirectUrl('https://search.brave.com')).toBe(true);
    expect(looksLikeDirectUrl('developer.mozilla.org/en-US')).toBe(true);
    expect(looksLikeDirectUrl('localhost:5173')).toBe(true);
    expect(looksLikeDirectUrl('brave browser extensions')).toBe(false);
    expect(looksLikeDirectUrl('weather')).toBe(false);
  });

  it('builds encoded search URLs for built-in and custom engines', () => {
    expect(buildSearchUrl('c++ & rust', 'brave')).toBe(
      'https://search.brave.com/search?q=c%2B%2B%20%26%20rust'
    );
    expect(buildSearchUrl('privacy', 'duckduckgo')).toBe(
      'https://duckduckgo.com/?q=privacy'
    );
    expect(
      buildSearchUrl('hello world', 'custom', 'https://my.search/find?term=%s')
    ).toBe('https://my.search/find?term=hello%20world');
  });

  it('generates readable monograms', () => {
    expect(getMonogram('Brave Search', 'https://search.brave.com')).toBe('BS');
    expect(getMonogram('GitHub', 'https://github.com')).toBe('GI');
    expect(getMonogram('', 'https://www.wikipedia.org')).toBe('WI');
  });
});
