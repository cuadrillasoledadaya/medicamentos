import { describe, it, expect } from 'vitest';
import {
  pushSubscriptionSchema,
  notificationDeliverySchema,
  pushPayloadSchema,
} from '@/types/push';

describe('PushSubscriptionRecord schema', () => {
  it('parses a valid subscription record', () => {
    const input = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '660e8400-e29b-41d4-a716-446655440001',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh: 'BO4j5VfK...',
      auth: '3MxR7...',
      device_name: 'Chrome on Android',
      is_active: true,
      created_at: '2026-06-26T10:00:00Z',
      last_seen_at: '2026-06-26T10:05:00Z',
    };
    const result = pushSubscriptionSchema.parse(input);
    expect(result.id).toBe(input.id);
    expect(result.endpoint).toBe(input.endpoint);
    expect(result.is_active).toBe(true);
  });

  it('allows nullable device_name and last_seen_at', () => {
    const input = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '660e8400-e29b-41d4-a716-446655440001',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh: 'BO4j5VfK...',
      auth: '3MxR7...',
      device_name: null,
      is_active: true,
      created_at: '2026-06-26T10:00:00Z',
      last_seen_at: null,
    };
    const result = pushSubscriptionSchema.parse(input);
    expect(result.device_name).toBeNull();
    expect(result.last_seen_at).toBeNull();
  });

  it('rejects missing required fields', () => {
    const input = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      // missing user_id, endpoint, p256dh, auth
      is_active: true,
      created_at: '2026-06-26T10:00:00Z',
    };
    expect(() => pushSubscriptionSchema.parse(input)).toThrow();
  });
});

describe('NotificationDeliveryRecord schema', () => {
  it('parses a successful delivery', () => {
    const input = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      toma_id: '660e8400-e29b-41d4-a716-446655440001',
      subscription_id: '770e8400-e29b-41d4-a716-446655440002',
      channel: 'web_push',
      sent_at: '2026-06-26T10:00:00Z',
      status: 'success',
      error_message: null,
    };
    const result = notificationDeliverySchema.parse(input);
    expect(result.status).toBe('success');
    expect(result.channel).toBe('web_push');
    expect(result.error_message).toBeNull();
  });

  it('parses a failed delivery with error message', () => {
    const input = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      toma_id: '660e8400-e29b-41d4-a716-446655440001',
      subscription_id: '770e8400-e29b-41d4-a716-446655440002',
      channel: 'web_push',
      sent_at: '2026-06-26T10:00:00Z',
      status: 'failure',
      error_message: 'HTTP 410 Gone',
    };
    const result = notificationDeliverySchema.parse(input);
    expect(result.status).toBe('failure');
    expect(result.error_message).toBe('HTTP 410 Gone');
  });

  it('rejects invalid status values', () => {
    const input = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      toma_id: '660e8400-e29b-41d4-a716-446655440001',
      subscription_id: '770e8400-e29b-41d4-a716-446655440002',
      channel: 'web_push',
      sent_at: '2026-06-26T10:00:00Z',
      status: 'pending', // invalid — only success/failure allowed
      error_message: null,
    };
    expect(() => notificationDeliverySchema.parse(input)).toThrow();
  });
});

describe('PushPayload schema', () => {
  it('parses a valid push payload', () => {
    const input = {
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
    const result = pushPayloadSchema.parse(input);
    expect(result.notification_id).toBe(input.notification_id);
    expect(result.type).toBe('medication_reminder');
    expect(result.medication_name).toBe('Losartán');
  });

  it('rejects payload missing notification_id', () => {
    const input = {
      type: 'medication_reminder',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      paciente_name: 'Abuela Rosa',
      medication_name: 'Losartán',
      dose: '50 mg',
      unit: 'mg',
      scheduled_at: '2026-06-26T08:00:00Z',
      action_url: '/today',
    };
    expect(() => pushPayloadSchema.parse(input)).toThrow();
  });

  it('rejects payload with wrong type value', () => {
    const input = {
      notification_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'wrong_type',
      paciente_id: '660e8400-e29b-41d4-a716-446655440001',
      paciente_name: 'Abuela Rosa',
      medication_name: 'Losartán',
      dose: '50 mg',
      unit: 'mg',
      scheduled_at: '2026-06-26T08:00:00Z',
      action_url: '/today',
    };
    expect(() => pushPayloadSchema.parse(input)).toThrow();
  });
});
