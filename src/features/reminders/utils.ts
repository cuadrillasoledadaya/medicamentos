// Reminders utils — iOS detection and notification reliability.
// Re-exports from scheduler.ts for the reminders feature boundary.

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isIOSPWA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isIOS() && ('standalone' in navigator && (navigator as any).standalone === true);
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export function getNotificationReliability(): 'green' | 'yellow' | 'red' {
  const permission = getNotificationPermission();
  if (permission === 'denied') return 'red';
  if (isIOS()) return 'yellow';
  return 'green';
}
