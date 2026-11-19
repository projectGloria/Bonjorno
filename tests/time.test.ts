import { describe, expect, it } from 'vitest';
import {
  formatDateDisplay,
  formatTimeParts,
  getTimeBasedGreeting,
} from '../src/utils/time';

describe('Time and greeting utilities', () => {
  it('formats 24h and 12h clocks accurately', () => {
    const afternoon = new Date(2026, 10, 19, 15, 7, 9);
    expect(formatTimeParts(afternoon, true, false)).toEqual({
      main: '15:07',
      seconds: '',
      period: '',
    });
    expect(formatTimeParts(afternoon, false, true)).toEqual({
      main: '3:07',
      seconds: '09',
      period: 'PM',
    });

    const midnight = new Date(2026, 10, 19, 0, 5, 0);
    expect(formatTimeParts(midnight, false, false)).toEqual({
      main: '12:05',
      seconds: '',
      period: 'AM',
    });
  });

  it('formats ISO date cleanly', () => {
    const d = new Date(2026, 10, 19, 9, 0, 0);
    expect(formatDateDisplay(d, 'iso')).toBe('2026-11-19');
  });

  it('computes time-of-day greetings and honors custom overrides', () => {
    expect(getTimeBasedGreeting(new Date(2026, 0, 1, 8, 0), 'Nihil', '')).toBe(
      'Good morning, Nihil'
    );
    expect(getTimeBasedGreeting(new Date(2026, 0, 1, 14, 0), '', '')).toBe(
      'Good afternoon'
    );
    expect(getTimeBasedGreeting(new Date(2026, 0, 1, 20, 0), '', '')).toBe(
      'Good evening'
    );
    expect(getTimeBasedGreeting(new Date(2026, 0, 1, 2, 0), '', '')).toBe(
      'Good night'
    );
    expect(
      getTimeBasedGreeting(new Date(2026, 0, 1, 8, 0), 'Nihil', 'Stay focused.')
    ).toBe('Stay focused.');
  });
});
