// Time helpers — timezone-aware formatting and parsing using date-fns-tz.

import { parse, addHours, subHours } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Format a UTC date string into a human-readable string in the given timezone.
 */
export function formatInTz(
  utcDate: Date | string,
  timeZone: string,
  formatStr: string = 'yyyy-MM-dd HH:mm',
): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return formatInTimeZone(date, timeZone, formatStr);
}

/**
 * Parse a date string as if it were in the given timezone, return as UTC Date.
 */
export function parseInTz(
  dateStr: string,
  formatStr: string,
  timeZone: string,
): Date {
  const parsed = parse(dateStr, formatStr, new Date());
  return fromZonedTime(parsed, timeZone);
}

/**
 * Shift a date by a number of hours (positive = forward, negative = backward).
 */
export function shiftTz(date: Date, hours: number): Date {
  return hours >= 0 ? addHours(date, hours) : subHours(date, Math.abs(hours));
}

/**
 * Convert a UTC Date to a zoned Date (wall-clock time in the target timezone).
 */
export function toZoned(date: Date, timeZone: string): Date {
  return toZonedTime(date, timeZone);
}
