import { z } from 'zod';

// ---------------------------------------------------------------------------
// PushSubscriptionRecord — row from push_subscriptions table
// ---------------------------------------------------------------------------

export const pushSubscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  device_name: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  last_seen_at: z.string().nullable(),
});

export type PushSubscriptionRecord = z.infer<typeof pushSubscriptionSchema>;

// ---------------------------------------------------------------------------
// NotificationDeliveryRecord — row from notification_deliveries table
// ---------------------------------------------------------------------------

export const notificationDeliverySchema = z.object({
  id: z.string().uuid(),
  toma_id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  channel: z.string().min(1),
  sent_at: z.string(),
  status: z.enum(['success', 'failure']),
  error_message: z.string().nullable(),
});

export type NotificationDeliveryRecord = z.infer<typeof notificationDeliverySchema>;

// ---------------------------------------------------------------------------
// PushPayload — the JSON object sent to the Service Worker via Web Push
// Matches the payload contract in the spec.
// ---------------------------------------------------------------------------

export const pushPayloadSchema = z.object({
  notification_id: z.string().uuid(),
  type: z.literal('medication_reminder'),
  paciente_id: z.string().uuid(),
  paciente_name: z.string().min(1),
  medication_name: z.string().min(1),
  dose: z.string().min(1),
  unit: z.string().min(1),
  scheduled_at: z.string(),
  action_url: z.string().min(1),
});

export type PushPayload = z.infer<typeof pushPayloadSchema>;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Validate a push payload from the Edge Function. Returns the parsed payload or null. */
export function validatePushPayload(data: unknown): PushPayload | null {
  const result = pushPayloadSchema.safeParse(data);
  return result.success ? result.data : null;
}

// ---------------------------------------------------------------------------
// Payload construction helpers (pure functions — testable with vitest)
// ---------------------------------------------------------------------------

/** Build a push payload from a toma row. Returns null if data is incomplete. */
export function buildPushPayload(toma: {
  toma_id: string;
  paciente_id: string;
  scheduled_at: string;
  medication_name: string;
  dose_value: number | null;
  dose_unit: string | null;
  paciente_name: string;
}): PushPayload | null {
  const hasDose = toma.dose_value != null && toma.dose_unit != null && toma.dose_unit.trim() !== '';
  const dose = hasDose ? `${toma.dose_value} ${toma.dose_unit}`.trim() : 'No especificada';
  const unit = hasDose ? toma.dose_unit! : 'unidad';

  return validatePushPayload({
    notification_id: toma.toma_id,
    type: 'medication_reminder',
    paciente_id: toma.paciente_id,
    paciente_name: toma.paciente_name,
    medication_name: toma.medication_name,
    dose,
    unit,
    scheduled_at: toma.scheduled_at,
    action_url: '/today',
  });
}

/**
 * Determine if a push service response indicates a dead subscription.
 * 410 Gone and 404 Not Found mean the endpoint is no longer valid.
 */
export function isSubscriptionDead(status: number): boolean {
  return status === 410 || status === 404;
}

/** Max VAPID payload size in bytes (4KB limit per Web Push spec). */
export const MAX_VAPID_PAYLOAD_BYTES = 4096;

// ---------------------------------------------------------------------------
// ClientSubscriptionPayload — normalized subscription object the client sends
// to the server when subscribing to push notifications.
// ---------------------------------------------------------------------------

export const clientSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type ClientSubscriptionPayload = z.infer<typeof clientSubscriptionSchema>;
