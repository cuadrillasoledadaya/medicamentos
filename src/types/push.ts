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
