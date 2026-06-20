import { describe, it, expect } from 'vitest';
import { computeNextState, canEditBackfill, isWithinTolerance } from '@/lib/repositories/tomas';

describe('computeNextState — state machine', () => {
  it('pending → taken_on_time (within 15 min tolerance)', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const takenAt = new Date('2024-01-15T08:10:00Z'); // 10 min later

    const result = computeNextState({
      currentState: 'pending',
      scheduledAt,
      now: takenAt,
      takenAt,
    });

    expect(result.status).toBe('taken_on_time');
    expect(result.takenAt).toBe(takenAt.toISOString());
    expect(result.skipReason).toBeNull();
  });

  it('pending → taken_on_time (exactly at boundary — 15 min)', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const takenAt = new Date('2024-01-15T08:15:00Z'); // exactly 15 min

    const result = computeNextState({
      currentState: 'pending',
      scheduledAt,
      now: takenAt,
      takenAt,
    });

    expect(result.status).toBe('taken_on_time');
  });

  it('pending → taken_late (after 15 min, within 7-day backfill)', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const takenAt = new Date('2024-01-15T09:00:00Z'); // 60 min later
    const now = new Date('2024-01-16T10:00:00Z'); // next day, within 7 days

    const result = computeNextState({
      currentState: 'pending',
      scheduledAt,
      now,
      takenAt,
    });

    expect(result.status).toBe('taken_late');
    expect(result.takenAt).toBe(takenAt.toISOString());
  });

  it('pending → taken_late (cross-day backfill within 7 days)', () => {
    const scheduledAt = new Date('2024-01-10T08:00:00Z');
    const takenAt = new Date('2024-01-15T08:00:00Z'); // 5 days later
    const now = new Date('2024-01-15T08:00:00Z');

    const result = computeNextState({
      currentState: 'pending',
      scheduledAt,
      now,
      takenAt,
    });

    expect(result.status).toBe('taken_late');
  });

  it('pending → rejected (beyond 7-day backfill window)', () => {
    const scheduledAt = new Date('2024-01-01T08:00:00Z');
    const takenAt = new Date('2024-01-15T08:00:00Z'); // 14 days later
    const now = new Date('2024-01-15T08:00:00Z');

    const result = computeNextState({
      currentState: 'pending',
      scheduledAt,
      now,
      takenAt,
    });

    // Beyond 7 days → rejected (stays pending, no state change)
    expect(result.status).toBe('pending');
    expect(result.takenAt).toBeNull();
  });

  it('pending → skipped (with skip reason)', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T08:00:00Z');

    const result = computeNextState({
      currentState: 'pending',
      scheduledAt,
      now,
      skipReason: 'vacation',
    });

    expect(result.status).toBe('skipped');
    expect(result.skipReason).toBe('vacation');
  });

  it('pending → missed (past tolerance window, no action)', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T09:00:00Z'); // 60 min after scheduled

    const result = computeNextState({
      currentState: 'pending',
      scheduledAt,
      now,
    });

    expect(result.status).toBe('missed');
  });

  it('idempotent: taken_on_time stays taken_on_time', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T08:30:00Z');

    const result = computeNextState({
      currentState: 'taken_on_time',
      scheduledAt,
      now,
    });

    expect(result.status).toBe('taken_on_time');
  });

  it('idempotent: taken_late stays taken_late', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T10:00:00Z');

    const result = computeNextState({
      currentState: 'taken_late',
      scheduledAt,
      now,
    });

    expect(result.status).toBe('taken_late');
  });

  it('idempotent: skipped stays skipped', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T09:00:00Z');

    const result = computeNextState({
      currentState: 'skipped',
      scheduledAt,
      now,
      skipReason: 'nausea',
    });

    expect(result.status).toBe('skipped');
    expect(result.skipReason).toBe('nausea');
  });

  it('idempotent: missed stays missed', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T10:00:00Z');

    const result = computeNextState({
      currentState: 'missed',
      scheduledAt,
      now,
    });

    expect(result.status).toBe('missed');
  });
});

describe('canEditBackfill', () => {
  it('returns true within 7-day window', () => {
    const scheduledAt = new Date('2024-01-10T08:00:00Z');
    const now = new Date('2024-01-15T08:00:00Z'); // 5 days later

    expect(canEditBackfill(scheduledAt, now)).toBe(true);
  });

  it('returns true at exactly 7 days', () => {
    const scheduledAt = new Date('2024-01-08T08:00:00Z');
    const now = new Date('2024-01-15T08:00:00Z'); // exactly 7 days

    expect(canEditBackfill(scheduledAt, now)).toBe(true);
  });

  it('returns false beyond 7-day window', () => {
    const scheduledAt = new Date('2024-01-01T08:00:00Z');
    const now = new Date('2024-01-15T08:00:00Z'); // 14 days later

    expect(canEditBackfill(scheduledAt, now)).toBe(false);
  });

  it('returns true for future scheduled dates', () => {
    const scheduledAt = new Date('2024-01-20T08:00:00Z');
    const now = new Date('2024-01-15T08:00:00Z'); // before scheduled

    expect(canEditBackfill(scheduledAt, now)).toBe(true);
  });
});

describe('isWithinTolerance', () => {
  it('returns true within 15-minute window', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T08:10:00Z'); // 10 min later

    expect(isWithinTolerance(scheduledAt, now)).toBe(true);
  });

  it('returns true at exactly 15 minutes', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T08:15:00Z');

    expect(isWithinTolerance(scheduledAt, now)).toBe(true);
  });

  it('returns false after 15 minutes', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T08:16:00Z'); // 16 min later

    expect(isWithinTolerance(scheduledAt, now)).toBe(false);
  });

  it('returns true before scheduled time', () => {
    const scheduledAt = new Date('2024-01-15T08:00:00Z');
    const now = new Date('2024-01-15T07:50:00Z'); // 10 min before

    expect(isWithinTolerance(scheduledAt, now)).toBe(true);
  });
});
