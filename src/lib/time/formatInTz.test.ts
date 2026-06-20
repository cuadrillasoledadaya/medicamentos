import { describe, it, expect } from 'vitest';
import { formatInTz, parseInTz, shiftTz } from '@/lib/time';

describe('formatInTz', () => {
  it('formats a UTC date in the same timezone', () => {
    // 2024-01-15 12:00 UTC
    const date = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    // UTC timezone — should show same time
    const result = formatInTz(date, 'UTC', 'yyyy-MM-dd HH:mm');
    expect(result).toBe('2024-01-15 12:00');
  });

  it('formats a UTC date in a different timezone', () => {
    // 2024-01-15 12:00 UTC = 2024-01-15 09:00 America/Argentina/Buenos_Aires (UTC-3)
    const date = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    const result = formatInTz(date, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH:mm');
    expect(result).toBe('2024-01-15 09:00');
  });

  it('handles DST boundary — summer time in Europe/Madrid', () => {
    // 2024-07-15 12:00 UTC = 2024-07-15 14:00 Europe/Madrid (UTC+2, CEST)
    const date = new Date(Date.UTC(2024, 6, 15, 12, 0, 0));
    const result = formatInTz(date, 'Europe/Madrid', 'yyyy-MM-dd HH:mm');
    expect(result).toBe('2024-07-15 14:00');
  });

  it('handles DST boundary — winter time in Europe/Madrid', () => {
    // 2024-01-15 12:00 UTC = 2024-01-15 13:00 Europe/Madrid (UTC+1, CET)
    const date = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    const result = formatInTz(date, 'Europe/Madrid', 'yyyy-MM-dd HH:mm');
    expect(result).toBe('2024-01-15 13:00');
  });

  it('accepts a date string as input', () => {
    const result = formatInTz('2024-01-15T12:00:00Z', 'UTC', 'yyyy-MM-dd HH:mm');
    expect(result).toBe('2024-01-15 12:00');
  });
});

describe('parseInTz', () => {
  it('parses a date string as if it were in the given timezone', () => {
    // Parse "2024-01-15 09:00" as Buenos Aires time (UTC-3) → should be 12:00 UTC
    const result = parseInTz('2024-01-15 09:00', 'yyyy-MM-dd HH:mm', 'America/Argentina/Buenos_Aires');
    expect(result.toISOString()).toBe('2024-01-15T12:00:00.000Z');
  });

  it('parses UTC correctly', () => {
    const result = parseInTz('2024-06-15 14:00', 'yyyy-MM-dd HH:mm', 'UTC');
    expect(result.toISOString()).toBe('2024-06-15T14:00:00.000Z');
  });
});

describe('shiftTz', () => {
  it('shifts forward by positive hours', () => {
    const date = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    const result = shiftTz(date, 3);
    expect(result.toISOString()).toBe('2024-01-15T15:00:00.000Z');
  });

  it('shifts backward by negative hours', () => {
    const date = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    const result = shiftTz(date, -5);
    expect(result.toISOString()).toBe('2024-01-15T07:00:00.000Z');
  });

  it('returns same date when shift is zero', () => {
    const date = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    const result = shiftTz(date, 0);
    expect(result.toISOString()).toBe('2024-01-15T12:00:00.000Z');
  });
});
