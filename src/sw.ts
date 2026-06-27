// Custom Service Worker for Medicamentos PWA.
// Uses injectManifest mode — Workbox precaching is injected at build time.
// This file is excluded from tsconfig.json and processed by vite-plugin-pwa.

// Workbox globals are available via the vite-plugin-pwa injectManifest build
// @ts-ignore
const { precacheAndRoute } = workbox.precaching;
// @ts-ignore
const { registerRoute } = workbox.routing;
// @ts-ignore
const { NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
// @ts-ignore
const { ExpirationPlugin } = workbox.expiration;

// Precache the app shell (self.__WB_MANIFEST is replaced by vite-plugin-pwa at build time)
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching for Supabase REST API
registerRoute(
  /^https:\/\/cmoydmfdhssxdmwqlueg\.supabase\.co\/rest\/v1\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  }),
);

// Static assets cache
registerRoute(
  /\.(?:js|css|woff2)$/,
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
  }),
);

// --- Notification Scheduler ---

const scheduledTimers = new Map();

/**
 * Show a notification with action buttons for a toma.
 */
function showTomaNotification(toma) {
  const doseText = toma.doseValue > 0
    ? `${toma.doseValue} ${toma.doseUnit}`
    : '';

  self.registration.showNotification('💊 Recordatorio de medicamento', {
    body: `${toma.medicationName}${doseText ? ` — ${doseText}` : ''}`,
    tag: `toma-${toma.id}`,
    requireInteraction: false,
    actions: [
      {
        action: 'taken',
        title: 'Marcar como tomada',
        icon: '/pwa-192x192.png',
      },
      {
        action: 'snooze',
        title: 'Posponer 10 min',
        icon: '/pwa-192x192.png',
      },
      {
        action: 'skip',
        title: 'Saltar',
        icon: '/pwa-192x192.png',
      },
    ],
  });
}

/**
 * Schedule a notification for a future toma.
 * Uses setTimeout for in-app notifications (app must be open).
 * Falls back to Notification Triggers API where supported.
 */
function scheduleTomaNotification(toma) {
  cancelTomaNotification(toma.id);

  const scheduledAt = new Date(toma.scheduledAt);
  const now = new Date();
  const delayMs = scheduledAt.getTime() - now.getTime();

  if (delayMs <= 0) {
    showTomaNotification(toma);
    return;
  }

  // Try Notification Triggers API first (Chrome 115+)
  if (typeof TimestampTrigger !== 'undefined') {
    try {
      self.registration.showNotification('💊 Recordatorio de medicamento', {
        body: `${toma.medicationName}`,
        tag: `toma-${toma.id}`,
        showTrigger: new TimestampTrigger(scheduledAt.getTime()),
        actions: [
          { action: 'taken', title: 'Marcar como tomada' },
          { action: 'snooze', title: 'Posponer 10 min' },
          { action: 'skip', title: 'Saltar' },
        ],
      });
      return;
    } catch {
      // Fall through to setTimeout
    }
  }

  const timerId = setTimeout(() => {
    showTomaNotification(toma);
    scheduledTimers.delete(toma.id);
  }, delayMs);

  scheduledTimers.set(toma.id, timerId);
}

/**
 * Cancel a scheduled notification.
 */
function cancelTomaNotification(tomaId) {
  const timerId = scheduledTimers.get(tomaId);
  if (timerId) {
    clearTimeout(timerId);
    scheduledTimers.delete(tomaId);
  }

  self.registration.getNotifications({ tag: `toma-${tomaId}` }).then((notifications) => {
    notifications.forEach((n) => n.close());
  });
}

// --- Message Handler (main thread → SW) ---

self.addEventListener('message', (event) => {
  const { type, toma, tomaId } = event.data;

  switch (type) {
    case 'SCHEDULE':
      if (toma) scheduleTomaNotification(toma);
      break;
    case 'CANCEL':
      if (tomaId) cancelTomaNotification(tomaId);
      break;
  }
});

// --- Notification Click Handler ---

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const tomaId = event.notification.tag?.replace('toma-', '');
  const action = event.action;

  // Body tap (no action button) -> navigate to /today
  if (!action) {
    event.waitUntil(self.clients.openWindow('/today'));
    return;
  }

  if (!tomaId) return; // orphan notification (no tag), safe no-op

  const message = { tomaId };

  switch (action) {
    case 'taken':
      message.type = 'TAKEN';
      message.takenAt = new Date().toISOString();
      event.waitUntil(self.clients.openWindow('/today'));
      break;
    case 'snooze':
      message.type = 'SNOOZE';
      message.snoozeMinutes = 10;
      break;
    case 'skip':
      message.type = 'SKIP';
      message.reason = 'notification-skip';
      event.waitUntil(self.clients.openWindow('/today'));
      break;
  }

  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
});

// --- Push Event Handler ---
//
// Handles incoming Web Push notifications from the Edge Function.
// Parses the payload, deduplicates by notification_id, and shows
// a notification with action buttons (taken/snooze/skip).

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    console.warn('[SW] Push event: malformed JSON');
    return;
  }

  // Validate required fields
  if (!data || typeof data !== 'object') return;
  if (!data.notification_id || !data.medication_name || !data.dose) {
    console.warn('[SW] Push event: missing required fields', data);
    return;
  }

  const notificationId = String(data.notification_id);
  const title = data.medication_name;
  const body = `${data.dose} (${data.scheduled_at || ''})`;

  // Dedupe: close any existing notification with the same tag
  self.registration.getNotifications({ tag: notificationId }).then((notifications) => {
    notifications.forEach((n) => n.close());
  });

  self.registration.showNotification(title, {
    body,
    tag: notificationId,
    icon: '/pwa-192x192.png',
    requireInteraction: false,
    actions: [
      { action: 'taken', title: 'Marcar como tomada', icon: '/pwa-192x192.png' },
      { action: 'snooze', title: 'Posponer 10 min', icon: '/pwa-192x192.png' },
      { action: 'skip', title: 'Saltar', icon: '/pwa-192x192.png' },
    ],
    data: {
      notification_id: notificationId,
      action_url: data.action_url || '/today',
      paciente_id: data.paciente_id,
    },
  });
});

// --- SW Lifecycle ---

self.addEventListener('install', (event) => {
  // Take control of all open clients immediately
  // @ts-ignore
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  // @ts-ignore
  event.waitUntil(self.clients.claim());
});

// --- Test Hooks (DEV ONLY) ---
//
// These hooks allow Playwright e2e tests to simulate push events and
// notification clicks without requiring a real push service. They are
// guarded so they never ship to production builds.
//
// Rationale: Headless Chromium cannot receive real Web Push notifications
// from a push service in CI/test environments. The test hooks expose the
// same code paths (push handler + notificationclick handler) that production
// uses, allowing e2e verification of the full flow.
//
// The guard checks for __VITE_DEV__ which is set to true only in dev mode
// by Vite's define plugin. In production builds, this is replaced with false
// and the entire block is tree-shaken away.
const __isDev = typeof import.meta !== 'undefined'
  && (import.meta as Record<string, unknown>).env?.DEV === true;

if (__isDev) {
  self.addEventListener('message', (event) => {
    const { type } = event.data || {};

    if (type === 'TEST_SIMULATE_PUSH') {
      const payload = event.data.payload;
      if (!payload || typeof payload !== 'object') return;
      if (!payload.notification_id || !payload.medication_name || !payload.dose) {
        console.warn('[SW][TEST] Push event: missing required fields', payload);
        return;
      }
      const notificationId = String(payload.notification_id);
      const title = payload.medication_name;
      const body = `${payload.dose} (${payload.scheduled_at || ''})`;
      self.registration.getNotifications({ tag: notificationId }).then((notifications) => {
        notifications.forEach((n) => n.close());
      });
      self.registration.showNotification(title, {
        body,
        tag: notificationId,
        icon: '/pwa-192x192.png',
        requireInteraction: false,
        actions: [
          { action: 'taken', title: 'Marcar como tomada', icon: '/pwa-192x192.png' },
          { action: 'snooze', title: 'Posponer 10 min', icon: '/pwa-192x192.png' },
          { action: 'skip', title: 'Saltar', icon: '/pwa-192x192.png' },
        ],
        data: {
          notification_id: notificationId,
          action_url: payload.action_url || '/today',
          paciente_id: payload.paciente_id,
        },
      });
    }

    if (type === 'TEST_SIMULATE_NOTIFICATION_CLICK') {
      const { notificationId, action } = event.data;
      if (!notificationId || !action) return;
      const message: Record<string, unknown> = { tomaId: notificationId };
      switch (action) {
        case 'taken':
          message.type = 'TAKEN';
          message.takenAt = new Date().toISOString();
          break;
        case 'snooze':
          message.type = 'SNOOZE';
          message.snoozeMinutes = 10;
          break;
        case 'skip':
          message.type = 'SKIP';
          message.reason = 'notification-skip';
          break;
      }
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage(message));
      });
    }
  });
}
