import { describe, it, expect } from 'vitest';
import {
  parsePushEvent,
  decidePushAction,
  buildNotificationOptions,
} from '@/features/notifications/swPushHandler';

/**
 * Unit tests for SW push handler pure logic.
 *
 * These test the decision-making functions extracted from the Service Worker
 * so they can be verified with vitest. The actual SW glue (showNotification,
 * clients.matchAll) is not tested here — it is covered by PR 5 e2e tests.
 *
 * Run: pnpm vitest run tests/unit/notifications/swPushHandler.test.ts
 */

// ---------------------------------------------------------------------------
// parsePushEvent
// ---------------------------------------------------------------------------

describe('parsePushEvent', () => {
  it('parses a valid push payload', () => {
    const data = {
      notification_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'medication_reminder',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      paciente_name: 'Abuela Rosa',
      medication_name: 'Losartán',
      dose: '50 mg',
      unit: 'mg',
      scheduled_at: '2026-06-26T08:00:00Z',
      action_url: '/today',
    };

    const result = parsePushEvent(JSON.stringify(data));
    expect(result).not.toBeNull();
    expect(result!.notification_id).toBe(data.notification_id);
    expect(result!.medication_name).toBe('Losartán');
    expect(result!.dose).toBe('50 mg');
  });

  it('returns null for empty string', () => {
    expect(parsePushEvent('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parsePushEvent('not-json')).toBeNull();
  });

  it('returns null when notification_id is missing', () => {
    const data = {
      type: 'medication_reminder',
      paciente_name: 'Test',
      medication_name: 'Test',
      dose: '1 mg',
      unit: 'mg',
      scheduled_at: '2026-06-26T08:00:00Z',
      action_url: '/today',
    };
    expect(parsePushEvent(JSON.stringify(data))).toBeNull();
  });

  it('returns null when type is wrong', () => {
    const data = {
      notification_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'wrong_type',
      paciente_name: 'Test',
      medication_name: 'Test',
      dose: '1 mg',
      unit: 'mg',
      scheduled_at: '2026-06-26T08:00:00Z',
      action_url: '/today',
    };
    expect(parsePushEvent(JSON.stringify(data))).toBeNull();
  });

  it('returns null for null event data', () => {
    expect(parsePushEvent(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decidePushAction
// ---------------------------------------------------------------------------

describe('decidePushAction', () => {
  it('routes "taken" action to TAKEN message', () => {
    const result = decidePushAction('taken', 'toma-abc');
    expect(result.type).toBe('TAKEN');
    expect(result.tomaId).toBe('abc');
    expect(result.takenAt).toBeDefined();
  });

  it('routes "snooze" action to SNOOZE message', () => {
    const result = decidePushAction('snooze', 'toma-xyz');
    expect(result.type).toBe('SNOOZE');
    expect(result.tomaId).toBe('xyz');
    expect(result.snoozeMinutes).toBe(10);
  });

  it('routes "skip" action to SKIP message', () => {
    const result = decidePushAction('skip', 'toma-123');
    expect(result.type).toBe('SKIP');
    expect(result.tomaId).toBe('123');
    expect(result.reason).toBe('notification-skip');
  });

  it('returns null for unknown action', () => {
    expect(decidePushAction('unknown', 'toma-abc')).toBeNull();
  });

  it('returns null for empty tomaId', () => {
    expect(decidePushAction('taken', '')).toBeNull();
  });

  it('returns null for no action (body tap)', () => {
    expect(decidePushAction('', 'toma-abc')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildNotificationOptions
// ---------------------------------------------------------------------------

describe('buildNotificationOptions', () => {
  it('builds options with 3 action buttons', () => {
    const payload = {
      notification_id: '550e8400-e29b-41d4-a716-446655440000',
      medication_name: 'Losartán',
      dose: '50 mg',
      unit: 'mg',
      scheduled_at: '2026-06-26T08:00:00Z',
      action_url: '/today',
    };

    const options = buildNotificationOptions(payload);
    expect(options.tag).toBe(payload.notification_id);
    expect(options.body).toContain('50 mg');
    expect(options.actions).toHaveLength(3);
    expect(options.actions![0].action).toBe('taken');
    expect(options.actions![1].action).toBe('snooze');
    expect(options.actions![2].action).toBe('skip');
  });

  it('includes scheduled_at in body', () => {
    const payload = {
      notification_id: 'abc',
      medication_name: 'Test',
      dose: '1 mg',
      unit: 'mg',
      scheduled_at: '2026-06-26T08:00:00Z',
      action_url: '/today',
    };

    const options = buildNotificationOptions(payload);
    expect(options.body).toContain('2026-06-26');
  });

  it('handles dose without unit gracefully', () => {
    const payload = {
      notification_id: 'abc',
      medication_name: 'Test',
      dose: 'No especificada',
      unit: 'unidad',
      scheduled_at: '2026-06-26T08:00:00Z',
      action_url: '/today',
    };

    const options = buildNotificationOptions(payload);
    expect(options.body).toContain('No especificada');
  });
});
