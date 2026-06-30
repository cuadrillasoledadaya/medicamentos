// swPushHandler.ts — pure logic for Service Worker push event handling.
//
// Extracted from sw.ts for testability. This module contains NO side effects
// (no showNotification, no clients.matchAll) — it takes raw input and returns
// decisions. The actual SW glue lives in sw.ts.
//
// The Zod schema is duplicated here because the SW bundle cannot import from
// '@/types/push' (Vite alias not available in SW build). This mirrors the
// existing pattern in supabase/functions/notify-fallback/push-schema.ts.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Push payload schema (duplicated for SW bundle — keep in sync with src/types/push.ts)
// ---------------------------------------------------------------------------

const swPushPayloadSchema = z.object({
  notification_id: z.string().uuid(),
  type: z.literal('medication_reminder'),
  paciente_id: z.string().uuid(),
  paciente_name: z.string().min(1),
  medication_name: z.string().min(1),
  dose: z.string().min(1),
  unit: z.string().min(1),
  scheduled_at: z.string(),
  action_url: z.string().min(1),
  // Alert behavior flags — default to TRUE so the schema is forward-compatible
  requireInteraction: z.boolean(),
  vibrate: z.boolean(),
  renotify: z.boolean(),
  badge: z.boolean(),
});

export type SwPushPayload = z.infer<typeof swPushPayloadSchema>;

// ---------------------------------------------------------------------------
// Push event parsing
// ---------------------------------------------------------------------------

/**
 * Parse and validate a push event's data payload.
 * Returns the validated payload or null if invalid.
 */
export function parsePushEvent(eventData: string | null): SwPushPayload | null {
  if (!eventData) return null;

  try {
    const parsed = JSON.parse(eventData);
    const result = swPushPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Action routing
// ---------------------------------------------------------------------------

/** Message sent to main thread when user clicks a notification action. */
export interface ActionMessage {
  type: 'TAKEN' | 'SNOOZE' | 'SKIP';
  tomaId: string;
  takenAt?: string;
  snoozeMinutes?: number;
  reason?: string;
}

/** Decision returned by decideNotificationClick for the SW notificationclick handler. */
export interface NotificationClickDecision {
  /** URL to open via clients.openWindow; null if no window should be opened. */
  openUrl: string | null;
  /** PostMessage to dispatch to matched clients; null if no message needed. */
  postMessage: ActionMessage | null;
}

/**
 * Decide what URL to open and what message to send when user clicks a notification.
 * Replaces the inline switch in sw.ts:150-186 for testability.
 */
export function decideNotificationClick(
  action: string,
  tag: string,
): NotificationClickDecision {
  const tomaId = tag.replace('toma-', '');
  if (!tomaId) {
    return { openUrl: null, postMessage: null };
  }

  // Body tap (no action) → open URL only, no postMessage
  if (!action) {
    return { openUrl: `/today?tomaId=${tomaId}`, postMessage: null };
  }

  const baseMessage: Omit<ActionMessage, 'type'> = { tomaId };

  switch (action) {
    case 'taken':
      return {
        openUrl: `/today?tomaId=${tomaId}&action=taken`,
        postMessage: { type: 'TAKEN', ...baseMessage, takenAt: new Date().toISOString() },
      };
    case 'snooze':
      return {
        openUrl: `/today?tomaId=${tomaId}&action=snooze`,
        postMessage: { type: 'SNOOZE', ...baseMessage, snoozeMinutes: 10 },
      };
    case 'skip':
      return {
        openUrl: `/today?tomaId=${tomaId}&action=skip`,
        postMessage: { type: 'SKIP', ...baseMessage, reason: 'notification-skip' },
      };
    default:
      return { openUrl: null, postMessage: null };
  }
}

/**
 * Decide what message to send to the main thread based on the action button.
 * Returns null for unknown actions or empty tomaId (body tap — handled separately).
 */
export function decidePushAction(
  action: string,
  tag: string,
): ActionMessage | null {
  const tomaId = tag.replace('toma-', '');
  if (!tomaId || !action) return null;

  switch (action) {
    case 'taken':
      return {
        type: 'TAKEN',
        tomaId,
        takenAt: new Date().toISOString(),
      };
    case 'snooze':
      return {
        type: 'SNOOZE',
        tomaId,
        snoozeMinutes: 10,
      };
    case 'skip':
      return {
        type: 'SKIP',
        tomaId,
        reason: 'notification-skip',
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Notification options builder
// ---------------------------------------------------------------------------

/**
 * Build NotificationOptions for showNotification from a validated push payload.
 */
export function buildNotificationOptions(
  payload: SwPushPayload,
): NotificationOptions {
  const opts: Record<string, unknown> = {
    body: `${payload.medication_name} — ${payload.dose} (${payload.scheduled_at})`,
    tag: payload.notification_id,
    icon: '/pwa-192x192.png',
    requireInteraction: payload.requireInteraction,
    actions: [
      { action: 'taken', title: 'Marcar como tomada', icon: '/pwa-192x192.png' },
      { action: 'snooze', title: 'Posponer 10 min', icon: '/pwa-192x192.png' },
      { action: 'skip', title: 'Saltar', icon: '/pwa-192x192.png' },
    ],
    data: {
      notification_id: payload.notification_id,
      action_url: payload.action_url,
      paciente_id: payload.paciente_id,
    },
  };
  if (payload.vibrate)  opts.vibrate  = [200, 100, 200, 100, 200];
  if (payload.renotify) opts.renotify = true;
  if (payload.badge)    opts.badge    = '/pwa-192x192.png';
  return opts as NotificationOptions;
}
