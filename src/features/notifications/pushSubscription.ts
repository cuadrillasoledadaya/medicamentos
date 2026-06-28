// pushSubscription.ts — client-side Web Push subscription helpers.
//
// Handles pushManager.subscribe, subscription persistence to Supabase,
// and device name parsing from navigator.userAgent.

import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Device name parsing
// ---------------------------------------------------------------------------

/**
 * Parse a short human-readable device label from a UA string.
 * Returns e.g. "Chrome on Android", "Safari on iPhone", "Unknown browser".
 */
export function parseDeviceName(userAgent: string): string {
  if (!userAgent) return 'Unknown browser';

  const ua = userAgent;

  // Detect OS (iPadOS reports as Macintosh — check CriOS/Mobile first)
  const isAndroid = /Android/.test(ua);
  const isIPad = /iPad/.test(ua) || (/(Macintosh|MacIntel)/.test(ua) && /CriOS|Mobile/.test(ua) && !/iPhone/.test(ua));
  const isIPhone = /iPhone/.test(ua);
  const isMac = /Macintosh|Mac OS X/.test(ua) && !isIPad && !isIPhone;
  const isWindows = /Windows/.test(ua);
  const isLinux = /Linux/.test(ua) && !isAndroid;

  const osLabel = isAndroid
    ? 'Android'
    : isIPad
      ? 'iPad'
      : isIPhone
        ? 'iPhone'
        : isMac
          ? 'macOS'
          : isWindows
            ? 'Windows'
            : isLinux
              ? 'Linux'
              : '';

  // Detect browser (order matters — Edge contains Chrome, Samsung contains Chrome)
  if (/Edg\//.test(ua)) return `Edge on ${osLabel || 'Unknown'}`;
  if (/SamsungBrowser/.test(ua)) return `Samsung Internet on ${osLabel || 'Android'}`;
  if (/CriOS/.test(ua)) return `Chrome on ${osLabel || 'Unknown'}`;
  if (/Chrome/.test(ua) && !/Safari\/[\d.]+ Gecko/.test(ua)) return `Chrome on ${osLabel || 'Unknown'}`;
  if (/Firefox/.test(ua)) return `Firefox on ${osLabel || 'Unknown'}`;
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return `Safari on ${osLabel || 'Unknown'}`;

  return 'Unknown browser';
}

// ---------------------------------------------------------------------------
// VAPID public key
// ---------------------------------------------------------------------------

/**
 * Read the VAPID public key from the Vite environment.
 * Throws if the key is missing — the subscription flow cannot work without it.
 */
export function getVapidPublicKey(): string {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!key) {
    throw new Error(
      'Missing VITE_VAPID_PUBLIC_KEY. Set it in .env.local (see VAPID.md).',
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// Subscription helpers
// ---------------------------------------------------------------------------

/** Normalized PushSubscription shape sent to the server. */
export interface NormalizedSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Subscribe to Web Push notifications.
 *
 * Calls pushManager.subscribe with the VAPID public key, normalizes the
 * subscription object, and inserts a row into push_subscriptions via Supabase.
 *
 * Returns the normalized subscription on success, or null if already subscribed.
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
): Promise<NormalizedSubscription | null> {
  // Check for existing subscription (idempotent)
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return normalizeSubscription(existing);
  }

  const applicationServerKey = urlBase64ToUint8Array(getVapidPublicKey());

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });

  const normalized = normalizeSubscription(subscription);

  // Persist to Supabase
  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    endpoint: normalized.endpoint,
    p256dh: normalized.keys.p256dh,
    auth: normalized.keys.auth,
    device_name: parseDeviceName(navigator.userAgent),
    is_active: true,
  } as any);

  if (error) {
    console.warn('[push-subscription] Supabase insert failed:', error);
    // Subscription was created but storage failed — unsubscribe to avoid orphan
    await subscription.unsubscribe();
    throw new Error(`Failed to save push subscription: ${error.message}`);
  }

  return normalized;
}

/**
 * Unsubscribe from Web Push notifications.
 *
 * Calls pushManager.unsubscribe() and marks the row as inactive in Supabase.
 */
export async function unsubscribeFromPush(
  registration: ServiceWorkerRegistration,
  endpoint: string,
): Promise<boolean> {
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;

  const unsubscribed = await subscription.unsubscribe();

  if (unsubscribed) {
    // Mark as inactive in Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('push_subscriptions') as any)
      .update({ is_active: false })
      .eq('endpoint', endpoint);
  }

  return unsubscribed;
}

/**
 * List all active push subscriptions for the current user.
 */
export async function listMyPushSubscriptions() {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, device_name, is_active, created_at, last_seen_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list subscriptions: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeSubscription(
  subscription: PushSubscription,
): NormalizedSubscription {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
  };
}

/**
 * Convert a base64 URL-safe VAPID public key to a Uint8Array.
 * Required by pushManager.subscribe({ applicationServerKey }).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
