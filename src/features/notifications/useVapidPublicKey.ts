// useVapidPublicKey — reads the VAPID public key from Vite env at runtime.
//
// Returns the key as a string if set, or null if missing.
// Used by the subscription flow to determine if Web Push is configurable.

/**
 * Read the VAPID public key from the Vite build environment.
 * Returns null if the key is not configured.
 */
export function getVapidPublicKeyStatic(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  return key && key.length > 0 ? key : null;
}

/**
 * React hook that returns the VAPID public key.
 * This is a static value (build-time env var), so no re-renders needed.
 */
export function useVapidPublicKey(): string | null {
  return getVapidPublicKeyStatic();
}
