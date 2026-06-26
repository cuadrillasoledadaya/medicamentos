// push-schema.ts — Zod schemas for push payloads (Deno-compatible)
//
// Mirrors src/types/push.ts for use in the notify-fallback Edge Function.
// Duplicated because Deno cannot resolve '@/types/push' or Vite aliases.
// Keep in sync with the client-side schema — both must validate the same
// payload contract defined in the spec.

import { z } from 'npm:zod@3.24.2';

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

export function validatePushPayload(data: unknown): PushPayload | null {
  const result = pushPayloadSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Build a push payload from a toma row and subscription info.
 * Returns the validated payload or null if data is incomplete.
 */
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
