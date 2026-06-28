// Notification scheduler — main-thread helper for scheduling/canceling SW notifications.
// Communicates with the Service Worker via postMessage.

const notificationTimers = new Map<string, number>();

/**
 * Request Notification permission from the user.
 * Returns the current permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const result = await Notification.requestPermission();
  return result;
}

/**
 * Get the current notification permission state.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Schedule a notification for a specific toma.
 * Sends a message to the Service Worker to schedule the notification.
 */
export function scheduleNotification(toma: {
  id: string;
  scheduled_at: string;
  medication_name?: string;
  dose_value?: number;
  dose_unit?: string;
}): void {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return;
  }

  const scheduledAt = new Date(toma.scheduled_at);
  const now = new Date();

  // Only schedule future tomas
  if (scheduledAt <= now) return;

  navigator.serviceWorker.controller.postMessage({
    type: 'SCHEDULE',
    toma: {
      id: toma.id,
      scheduledAt: toma.scheduled_at,
      medicationName: toma.medication_name ?? 'Medicamento',
      doseValue: toma.dose_value ?? 0,
      doseUnit: toma.dose_unit ?? '',
    },
  });
}

/**
 * Cancel a scheduled notification for a specific toma.
 */
export function cancelNotification(tomaId: string): void {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'CANCEL',
    tomaId,
  });

  // Also clear any local timers
  const timerId = notificationTimers.get(tomaId);
  if (timerId) {
    clearTimeout(timerId);
    notificationTimers.delete(tomaId);
  }
}

/**
 * Detect if the user is on iOS (for notification reliability badge).
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if the PWA is running in standalone mode on iOS.
 * Returns true if the app is installed as a home-screen PWA.
 */
export function isIOSStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return isIOS() && window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Get the notification reliability status.
 * Returns 'green' (likely delivered), 'yellow' (iOS — in-app only), or 'red' (permission denied).
 */
export function getNotificationReliability(): 'green' | 'yellow' | 'red' {
  const permission = getNotificationPermission();

  if (permission === 'denied') return 'red';
  if (isIOS()) return 'yellow';
  return 'green';
}

/**
 * Set up message handler for SW → main thread communication.
 * Handles TAKEN, SNOOZE, and SKIP actions from notification buttons.
 */
export function setupNotificationMessageHandler(
  callbacks: {
    onTaken?: (tomaId: string) => void;
    onSnooze?: (tomaId: string, minutes: number) => void;
    onSkip?: (tomaId: string, reason: string) => void;
  },
): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, tomaId, snoozeMinutes, reason } = event.data;

    switch (type) {
      case 'TAKEN':
        callbacks.onTaken?.(tomaId);
        break;
      case 'SNOOZE':
        callbacks.onSnooze?.(tomaId, snoozeMinutes);
        break;
      case 'SKIP':
        callbacks.onSkip?.(tomaId, reason ?? 'notification-skip');
        break;
    }
  });
}

/**
 * Map a DOMException name or failure reason to a user-friendly Spanish message.
 * Unknown reasons are logged to console.warn with a truncated userAgent for debugging.
 */
export function mapSubscriptionErrorToSpanish(reason: string): string {
  switch (reason) {
    case 'NotAllowedError':
      return 'Tu navegador bloqueó la suscripción. Usá una ventana normal o verificá los permisos.';
    case 'AbortError':
      return 'La suscripción se canceló. Intentá de nuevo.';
    case 'SecurityError':
      return 'La suscripción push no está disponible en este contexto (HTTP sin SSL o iframe).';
    default:
      console.warn(reason, { userAgent: navigator.userAgent.slice(0, 80) });
      return 'No se pudo activar las notificaciones push. Intentá de nuevo.';
  }
}

/**
 * Request push subscription: permission + pushManager.subscribe + save to server.
 *
 * Returns { ok: true } on success, or { ok: false, reason } on failure.
 * This is the entry point for new users enabling web_push.
 */
export async function requestPushSubscription(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  // iOS check: web push only works in standalone PWA mode
  if (isIOS() && !isIOSStandalone()) {
    return { ok: false, reason: 'ios-not-standalone' };
  }

  // Check for Service Worker registration
  if (!('serviceWorker' in navigator)) {
    return { ok: false, reason: 'no-service-worker' };
  }

  const registration = await navigator.serviceWorker.ready;

  // Check for PushManager support
  if (!('PushManager' in window)) {
    return { ok: false, reason: 'no-push-manager' };
  }

  try {
    const { subscribeToPush } = await import('./pushSubscription');
    await subscribeToPush(registration);
    return { ok: true };
  } catch (err) {
    console.warn('[push-subscription] handshake failed:', err, {
      userAgent: navigator.userAgent,
    });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, reason: message };
  }
}
