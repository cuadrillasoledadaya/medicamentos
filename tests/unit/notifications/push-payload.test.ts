import { describe, it, expect } from 'vitest';
import {
  buildPushPayload,
  isSubscriptionDead,
  MAX_VAPID_PAYLOAD_BYTES,
  validatePushPayload,
} from '@/types/push';

/**
 * Unit tests for web-push payload construction and subscription pruning logic.
 *
 * These test the pure functions extracted from the notify-fallback Edge Function
 * so they can be verified with vitest. The Deno-specific glue (Deno.env,
 * webpush.sendNotification) is not tested at the unit level — it is covered
 * by the PR 5 e2e tests.
 *
 * Run: pnpm vitest run tests/unit/notifications/push-payload.test.ts
 */

// ---------------------------------------------------------------------------
// buildPushPayload
// ---------------------------------------------------------------------------

describe('buildPushPayload', () => {
  it('builds a valid payload from a complete toma row', () => {
    const toma = {
      toma_id: '550e8400-e29b-41d4-a716-446655440000',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-06-26T08:00:00Z',
      medication_name: 'Losartán',
      dose_value: 50,
      dose_unit: 'mg',
      paciente_name: 'Abuela Rosa',
    };

    const result = buildPushPayload(toma);
    expect(result).not.toBeNull();
    expect(result!.notification_id).toBe(toma.toma_id);
    expect(result!.type).toBe('medication_reminder');
    expect(result!.medication_name).toBe('Losartán');
    expect(result!.dose).toBe('50 mg');
    expect(result!.unit).toBe('mg');
    expect(result!.paciente_name).toBe('Abuela Rosa');
    expect(result!.action_url).toBe('/today');
  });

  it('formats dose as "No especificada" when dose_value is null', () => {
    const toma = {
      toma_id: '550e8400-e29b-41d4-a716-446655440000',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-06-26T08:00:00Z',
      medication_name: 'Aspirina',
      dose_value: null,
      dose_unit: 'mg',
      paciente_name: 'Abuelo Juan',
    };

    const result = buildPushPayload(toma);
    expect(result).not.toBeNull();
    expect(result!.dose).toBe('No especificada');
  });

  it('formats dose as "No especificada" when dose_unit is null', () => {
    const toma = {
      toma_id: '550e8400-e29b-41d4-a716-446655440000',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-06-26T08:00:00Z',
      medication_name: 'Ibuprofeno',
      dose_value: 400,
      dose_unit: null,
      paciente_name: 'Mamá',
    };

    const result = buildPushPayload(toma);
    expect(result).not.toBeNull();
    expect(result!.dose).toBe('No especificada');
  });

  it('returns null if toma_id is not a valid UUID', () => {
    const toma = {
      toma_id: 'not-a-uuid',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-06-26T08:00:00Z',
      medication_name: 'Test',
      dose_value: 1,
      dose_unit: 'mg',
      paciente_name: 'Test',
    };

    const result = buildPushPayload(toma);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isSubscriptionDead
// ---------------------------------------------------------------------------

describe('isSubscriptionDead', () => {
  it('returns true for 410 Gone', () => {
    expect(isSubscriptionDead(410)).toBe(true);
  });

  it('returns true for 404 Not Found', () => {
    expect(isSubscriptionDead(404)).toBe(true);
  });

  it('returns false for 200 OK', () => {
    expect(isSubscriptionDead(200)).toBe(false);
  });

  it('returns false for 500 server error', () => {
    expect(isSubscriptionDead(500)).toBe(false);
  });

  it('returns false for 403 forbidden', () => {
    expect(isSubscriptionDead(403)).toBe(false);
  });

  it('returns false for 0 (no status)', () => {
    expect(isSubscriptionDead(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VAPID payload size limits
// ---------------------------------------------------------------------------

describe('VAPID payload size', () => {
  it('a normal payload is well under the 4KB limit', () => {
    const toma = {
      toma_id: '550e8400-e29b-41d4-a716-446655440000',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-06-26T08:00:00Z',
      medication_name: 'Losartán 50mg',
      dose_value: 50,
      dose_unit: 'mg',
      paciente_name: 'Abuela Rosa García Martínez',
    };

    const result = buildPushPayload(toma);
    expect(result).not.toBeNull();
    const bytes = new TextEncoder().encode(JSON.stringify(result)).length;
    expect(bytes).toBeLessThan(MAX_VAPID_PAYLOAD_BYTES);
    // Typical payload should be under 500 bytes
    expect(bytes).toBeLessThan(500);
  });

  it('a payload with very long medication name stays under 4KB', () => {
    const toma = {
      toma_id: '550e8400-e29b-41d4-a716-446655440000',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-06-26T08:00:00Z',
      medication_name: 'A'.repeat(200),
      dose_value: 999,
      dose_unit: 'mg',
      paciente_name: 'B'.repeat(200),
    };

    const result = buildPushPayload(toma);
    expect(result).not.toBeNull();
    const bytes = new TextEncoder().encode(JSON.stringify(result)).length;
    expect(bytes).toBeLessThan(MAX_VAPID_PAYLOAD_BYTES);
  });

  it('MAX_VAPID_PAYLOAD_BYTES is 4096', () => {
    expect(MAX_VAPID_PAYLOAD_BYTES).toBe(4096);
  });
});

// ---------------------------------------------------------------------------
// validatePushPayload — additional coverage beyond PR 1 tests
// ---------------------------------------------------------------------------

describe('validatePushPayload (additional)', () => {
  it('returns null for empty object', () => {
    expect(validatePushPayload({})).toBeNull();
  });

  it('returns null for null input', () => {
    expect(validatePushPayload(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(validatePushPayload(undefined)).toBeNull();
  });

  it('returns null when notification_id is missing', () => {
    const input = {
      type: 'medication_reminder',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      paciente_name: 'Test',
      medication_name: 'Test',
      dose: '1 mg',
      unit: 'mg',
      scheduled_at: '2026-06-26T08:00:00Z',
      action_url: '/today',
    };
    expect(validatePushPayload(input)).toBeNull();
  });

  it('round-trips through JSON.stringify/parse', () => {
    const toma = {
      toma_id: '550e8400-e29b-41d4-a716-446655440000',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-06-26T08:00:00Z',
      medication_name: 'Test',
      dose_value: 1,
      dose_unit: 'mg',
      paciente_name: 'Test',
    };

    const payload = buildPushPayload(toma);
    expect(payload).not.toBeNull();

    const serialized = JSON.stringify(payload);
    const parsed = JSON.parse(serialized);
    const revalidated = validatePushPayload(parsed);

    expect(revalidated).not.toBeNull();
    expect(revalidated!.notification_id).toBe(payload!.notification_id);
  });
});
