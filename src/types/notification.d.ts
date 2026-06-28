// Module augmentation: extend the TypeScript DOM lib's NotificationOptions
// and NotificationAction with the fields the Web Notifications API supports
// but the bundled lib.dom.d.ts (TypeScript 6.0.3) is missing.
//
// Fields added:
//   NotificationOptions.actions  — array of action buttons (taken/snooze/skip)
//   NotificationOptions.vibrate  — haptic pattern (Android Chrome)
//   NotificationOptions.renotify — re-alert when replacing a same-tag notif
//   NotificationAction interface — shape of each action button
//
// `badge` is already present in lib.dom.d.ts — no need to re-declare it.
//
// This file is picked up automatically by tsconfig.json (include: ["src"]).
// See:
//   - https://developer.mozilla.org/en-US/docs/Web/API/Notification/actions
//   - https://developer.mozilla.org/en-US/docs/Web/API/Notification/vibrate
//   - https://developer.mozilla.org/en-US/docs/Web/API/Notification/renotify

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface NotificationOptions {
  actions?: NotificationAction[];
  renotify?: boolean;
  vibrate?: number | number[];
}

export {};
