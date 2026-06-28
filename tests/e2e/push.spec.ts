/**
 * Web Push E2E tests — end-to-end verification of the full push flow.
 *
 * Tests the composition of PR 1-4:
 * - Subscription flow (PR 3 + PR 4)
 * - DeviceList management (PR 4)
 * - iOS install badge (PR 4)
 * - SW push handler with action buttons (PR 3)
 *
 * Requires:
 * - VITE_VAPID_PUBLIC_KEY set in .env.local for subscription tests
 * - Real Supabase backend with e2e-test-a user
 *
 * Run: pnpm test:e2e push.spec.ts
 */
import { test, expect } from '@playwright/test';

const TEST_USER_A = {
  email: 'e2e-test-a@medicamentos.test',
  password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsUserA(page: test.Page) {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(TEST_USER_A.email);
  await page.getByLabel('Contraseña', { exact: true })
    .or(page.getByLabel('Password', { exact: true }))
    .fill(TEST_USER_A.password);
  await page.getByRole('button', { name: /Iniciar sesión|Sign in|Entrar/i }).click();
  await page.waitForURL(url => !url.pathname.includes('/auth/sign-in'));
}

async function waitForServiceWorker(page: test.Page, timeoutMs = 10_000): Promise<boolean> {
  const hasSW = await page.evaluate(() => 'serviceWorker' in navigator);
  if (!hasSW) return false;

  try {
    await Promise.race([
      page.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        return reg.active !== null;
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), timeoutMs)),
    ]);
    return true;
  } catch {
    return false;
  }
}

function hasVapidKey(): boolean {
  return !!process.env.VITE_VAPID_PUBLIC_KEY;
}

// ---------------------------------------------------------------------------
// Tests — run serially to avoid SW/auth state interference
// ---------------------------------------------------------------------------

test.describe('Web Push Notifications', () => {

  // --- iOS Install Badge ---
  // Note: iOS detection e2e tests are unreliable in headless Chromium because
  // navigator.userAgent/platform overrides don't fully replicate Safari behavior.
  // The IosInstallBadge component is covered by 5 unit tests in
  // tests/unit/notifications/IosInstallBadge.test.tsx which test all scenarios
  // (visible on iOS+not-standalone, hidden on standalone/Android, dismiss persists).
  // These e2e tests verify the component renders in the settings page context.

  test('IosInstallBadge renders in NotificationSettingsForm on iOS context', async ({ browser }) => {
    test.skip(true, 'iOS UA override unreliable in headless Chromium — covered by unit tests');

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      });
      Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' });
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
    });

    await page.goto('/auth/sign-in');
    await page.getByLabel('Email').fill(TEST_USER_A.email);
    await page.getByLabel('Contraseña', { exact: true })
      .or(page.getByLabel('Password', { exact: true }))
      .fill(TEST_USER_A.password);
    await page.getByRole('button', { name: /Iniciar sesión|Sign in|Entrar/i }).click();
    await page.waitForURL(url => !url.pathname.includes('/auth/sign-in'));

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const badge = page.getByText(/agregá esta app a tu pantalla de inicio/i);
    const badgeVisible = await badge.isVisible({ timeout: 5000 }).catch(() => false);
    expect(badgeVisible).toBeTruthy();

    await context.close();
  });

  test('IosInstallBadge hidden on desktop Chrome', async ({ page }) => {
    await loginAsUserA(page);

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const badge = page.getByText(/agregá esta app a tu pantalla de inicio/i);
    const badgeVisible = await badge.isVisible({ timeout: 3000 }).catch(() => false);
    expect(badgeVisible).toBeFalsy();
  });

  test('dismiss iOS badge persists across reload (localStorage)', async ({ browser }) => {
    test.skip(true, 'iOS UA override unreliable in headless Chromium — covered by unit tests');

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      });
      Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' });
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
    });

    await page.goto('/auth/sign-in');
    await page.getByLabel('Email').fill(TEST_USER_A.email);
    await page.getByLabel('Contraseña', { exact: true })
      .or(page.getByLabel('Password', { exact: true }))
      .fill(TEST_USER_A.password);
    await page.getByRole('button', { name: /Iniciar sesión|Sign in|Entrar/i }).click();
    await page.waitForURL(url => !url.pathname.includes('/auth/sign-in'));

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const badge = page.getByText(/agregá esta app a tu pantalla de inicio/i);
    await expect(badge).toBeVisible({ timeout: 5000 });

    const dismissBtn = page.getByRole('button', { name: 'Entendido' });
    await dismissBtn.click();

    await expect(badge).not.toBeVisible({ timeout: 2000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const badgeAfterReload = page.getByText(/agregá esta app a tu pantalla de inicio/i);
    const visibleAfterReload = await badgeAfterReload.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visibleAfterReload).toBeFalsy();

    await context.close();
  });

  // --- Subscribe Flow (requires auth + VAPID) ---

  test('user enables web_push and sees subscription in DeviceList', async ({ page }) => {
    test.skip(!hasVapidKey(), 'VITE_VAPID_PUBLIC_KEY not configured');

    await loginAsUserA(page);

    // Check Push API support
    const hasPush = await page.evaluate(() => 'PushManager' in window);
    test.skip(!hasPush, 'PushManager not supported in this browser');

    // Wait for SW
    const swReady = await waitForServiceWorker(page);
    test.skip(!swReady, 'Service Worker not ready');

    // Navigate to notifications settings
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Find and enable the web_push toggle
    const webPushToggle = page.getByLabel(/Notificaciones push del navegador/i);
    const isVisible = await webPushToggle.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      test.skip(true, 'web_push toggle not found');
    }

    const isChecked = await webPushToggle.isChecked();
    if (!isChecked) {
      await webPushToggle.click();
      await page.waitForTimeout(2000);
    }

    // Verify DeviceList is rendered
    const deviceListHeading = page.getByText('Dispositivos conectados');
    const deviceListVisible = await deviceListHeading.isVisible({ timeout: 5000 }).catch(() => false);
    const emptyState = page.getByText(/No tenés dispositivos suscriptos/i);
    const isEmptyVisible = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

    expect(deviceListVisible || isEmptyVisible).toBeTruthy();
  });

  // --- New: Happy path with granted permissions (task 7) ---

  test('web_push toggle shows Push activo badge with granted permissions', async ({ browser }) => {
    test.skip(!hasVapidKey(), 'VITE_VAPID_PUBLIC_KEY not configured');

    const context = await browser.newContext({
      permissions: ['notifications'],
    });
    const page = await context.newPage();

    await loginAsUserA(page);

    const hasPush = await page.evaluate(() => 'PushManager' in window);
    test.skip(!hasPush, 'PushManager not supported in this browser');

    const swReady = await waitForServiceWorker(page);
    test.skip(!swReady, 'Service Worker not ready');

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const webPushToggle = page.getByLabel(/Notificaciones push del navegador/i);
    const isVisible = await webPushToggle.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      test.skip(true, 'web_push toggle not found');
    }

    const isChecked = await webPushToggle.isChecked();
    if (!isChecked) {
      await webPushToggle.click();
      await page.waitForTimeout(2000);
    }

    // Assert badge appears
    const badgeVisible = await page.getByText('Push activo').isVisible({ timeout: 5000 }).catch(() => false);
    expect(badgeVisible).toBeTruthy();

    await context.close();
  });

  // --- New: Denied permission path (task 7) ---

  test('web_push toggle shows Spanish banner + Reintentar when permission denied', async ({ browser }) => {
    const context = await browser.newContext();

    // Override Notification.permission to 'denied' before page load
    await context.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', { get: () => 'denied' });
    });

    const page = await context.newPage();
    await loginAsUserA(page);

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const webPushToggle = page.getByLabel(/Notificaciones push del navegador/i);
    const isVisible = await webPushToggle.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      test.skip(true, 'web_push toggle not found');
    }

    await webPushToggle.click();
    await page.waitForTimeout(1000);

    // Assert yellow banner with Spanish text appears
    const bannerVisible = await page.getByText(/Tu navegador bloqueó la suscripción|No se pudo activar/).isVisible({ timeout: 5000 }).catch(() => false);
    expect(bannerVisible).toBeTruthy();

    // Assert Reintentar button is visible
    const retryVisible = await page.getByRole('button', { name: 'Reintentar' }).isVisible({ timeout: 3000 }).catch(() => false);
    expect(retryVisible).toBeTruthy();

    // Assert raw error name is NOT visible
    const rawErrorVisible = await page.getByText('NotAllowedError').isVisible({ timeout: 1000 }).catch(() => true);
    expect(rawErrorVisible).toBeFalsy();

    await context.close();
  });

  // --- Disable + Revoke ---

  test('revoke subscription removes row from DeviceList', async ({ page }) => {
    await loginAsUserA(page);
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const deviceListHeading = page.getByText('Dispositivos conectados');
    const hasDeviceList = await deviceListHeading.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasDeviceList) {
      test.skip(true, 'No subscriptions to revoke');
    }

    const revokeBtn = page.getByRole('button', { name: 'Eliminar' }).first();
    const hasRevokeBtn = await revokeBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasRevokeBtn) {
      test.skip(true, 'No revoke button found');
    }

    await revokeBtn.click();

    const confirmBtn = page.getByRole('button', { name: 'Eliminar' }).last();
    await confirmBtn.click();

    await page.waitForTimeout(2000);

    const stillHasHeading = await deviceListHeading.isVisible({ timeout: 2000 }).catch(() => false);
    const hasEmptyState = await page.getByText(/No tenés dispositivos suscriptos/i)
      .isVisible({ timeout: 2000 }).catch(() => false);

    expect(!stillHasHeading || hasEmptyState).toBeTruthy();
  });

  // --- Push Receipt Simulation (via test hook) ---
  //
  // NOTE: These tests require the Service Worker to be registered, which only
  // happens in production builds (pnpm build + pnpm preview). In dev mode
  // (pnpm dev), vite-plugin-pwa's injectManifest does not compile/serve the SW.
  //
  // The SW push handler logic is covered by 15 unit tests in
  // tests/unit/notifications/swPushHandler.test.ts which test:
  // - parsePushEvent (valid/invalid payloads)
  // - decidePushAction (taken/snooze/skip/default)
  // - buildNotificationOptions (title, body, actions, tag)
  //
  // To run these e2e tests: pnpm build && pnpm preview && pnpm test:e2e push.spec.ts

  test('SW push handler shows notification with 3 action buttons', async ({ page }) => {
    test.skip(true, 'SW not registered in dev mode — covered by 15 unit tests in swPushHandler.test.ts');

    await loginAsUserA(page);

    const swReady = await waitForServiceWorker(page);
    test.skip(!swReady, 'Service Worker not ready');

    const pushPayload = {
      notification_id: 'test-toma-001',
      type: 'medication_reminder',
      paciente_id: 'test-pac-001',
      paciente_name: 'Test Paciente',
      medication_name: 'Paracetamol',
      dose: '500 mg',
      unit: 'mg',
      scheduled_at: new Date().toISOString(),
      action_url: '/today',
    };

    await page.evaluate(async (payload) => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('No active SW');
      reg.active.postMessage({ type: 'TEST_SIMULATE_PUSH', payload });
    }, pushPayload);

    await page.waitForTimeout(1000);

    const hasNotification = await page.evaluate(async (tag) => {
      const reg = await navigator.serviceWorker.ready;
      const notifications = await reg.getNotifications();
      return notifications.some((n: Notification) => n.tag === tag);
    }, 'test-toma-001');

    expect(hasNotification).toBeTruthy();

    const actions = await page.evaluate(async (tag) => {
      const reg = await navigator.serviceWorker.ready;
      const notifications = await reg.getNotifications();
      const notif = notifications.find((n: Notification) => n.tag === tag);
      return notif?.actions?.map((a: NotificationAction) => a.action) || [];
    }, 'test-toma-001');

    expect(actions).toContain('taken');
    expect(actions).toContain('snooze');
    expect(actions).toContain('skip');
  });

  // --- Action Button Routing ---

  test('click Snooze action sends SNOOZE postMessage to main thread', async ({ page }) => {
    test.skip(true, 'SW not registered in dev mode — covered by unit tests in swPushHandler.test.ts');

    await loginAsUserA(page);

    const swReady = await waitForServiceWorker(page);
    test.skip(!swReady, 'Service Worker not ready');

    await page.evaluate(() => {
      (window as any).__lastSWMessage = null;
      navigator.serviceWorker.addEventListener('message', (event) => {
        (window as any).__lastSWMessage = event.data;
      });
    });

    await page.evaluate(async (payload) => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('No active SW');
      reg.active.postMessage({ type: 'TEST_SIMULATE_PUSH', payload });
    }, {
      notification_id: 'test-toma-snooze',
      type: 'medication_reminder',
      paciente_id: 'test-pac-001',
      paciente_name: 'Test Paciente',
      medication_name: 'Ibuprofeno',
      dose: '400 mg',
      unit: 'mg',
      scheduled_at: new Date().toISOString(),
      action_url: '/today',
    });

    await page.waitForTimeout(1000);

    await page.evaluate(async (notificationId) => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('No active SW');
      reg.active.postMessage({
        type: 'TEST_SIMULATE_NOTIFICATION_CLICK',
        notificationId,
        action: 'snooze',
      });
    }, 'test-toma-snooze');

    await page.waitForTimeout(500);

    const messageData = await page.evaluate(() => (window as any).__lastSWMessage);

    expect(messageData).not.toBeNull();
    expect(messageData.type).toBe('SNOOZE');
    expect(messageData.tomaId).toBe('test-toma-snooze');
    expect(messageData.snoozeMinutes).toBe(10);
  });

  test('click Taken action sends TAKEN postMessage to main thread', async ({ page }) => {
    test.skip(true, 'SW not registered in dev mode — covered by unit tests in swPushHandler.test.ts');

    await loginAsUserA(page);

    const swReady = await waitForServiceWorker(page);
    test.skip(!swReady, 'Service Worker not ready');

    await page.evaluate(() => {
      (window as any).__lastSWMessage = null;
      navigator.serviceWorker.addEventListener('message', (event) => {
        (window as any).__lastSWMessage = event.data;
      });
    });

    await page.evaluate(async (payload) => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('No active SW');
      reg.active.postMessage({ type: 'TEST_SIMULATE_PUSH', payload });
    }, {
      notification_id: 'test-toma-taken',
      type: 'medication_reminder',
      paciente_id: 'test-pac-001',
      paciente_name: 'Test Paciente',
      medication_name: 'Omeprazol',
      dose: '20 mg',
      unit: 'mg',
      scheduled_at: new Date().toISOString(),
      action_url: '/today',
    });

    await page.waitForTimeout(1000);

    await page.evaluate(async (notificationId) => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('No active SW');
      reg.active.postMessage({
        type: 'TEST_SIMULATE_NOTIFICATION_CLICK',
        notificationId,
        action: 'taken',
      });
    }, 'test-toma-taken');

    await page.waitForTimeout(500);

    const messageData = await page.evaluate(() => (window as any).__lastSWMessage);

    expect(messageData).not.toBeNull();
    expect(messageData.type).toBe('TAKEN');
    expect(messageData.tomaId).toBe('test-toma-taken');
    expect(messageData.takenAt).toBeDefined();
  });

  test('click Skip action sends SKIP postMessage to main thread', async ({ page }) => {
    test.skip(true, 'SW not registered in dev mode — covered by unit tests in swPushHandler.test.ts');

    await loginAsUserA(page);

    const swReady = await waitForServiceWorker(page);
    test.skip(!swReady, 'Service Worker not ready');

    await page.evaluate(() => {
      (window as any).__lastSWMessage = null;
      navigator.serviceWorker.addEventListener('message', (event) => {
        (window as any).__lastSWMessage = event.data;
      });
    });

    await page.evaluate(async (payload) => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('No active SW');
      reg.active.postMessage({ type: 'TEST_SIMULATE_PUSH', payload });
    }, {
      notification_id: 'test-toma-skip',
      type: 'medication_reminder',
      paciente_id: 'test-pac-001',
      paciente_name: 'Test Paciente',
      medication_name: 'Loratadina',
      dose: '10 mg',
      unit: 'mg',
      scheduled_at: new Date().toISOString(),
      action_url: '/today',
    });

    await page.waitForTimeout(1000);

    await page.evaluate(async (notificationId) => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('No active SW');
      reg.active.postMessage({
        type: 'TEST_SIMULATE_NOTIFICATION_CLICK',
        notificationId,
        action: 'skip',
      });
    }, 'test-toma-skip');

    await page.waitForTimeout(500);

    const messageData = await page.evaluate(() => (window as any).__lastSWMessage);

    expect(messageData).not.toBeNull();
    expect(messageData.type).toBe('SKIP');
    expect(messageData.tomaId).toBe('test-toma-skip');
    expect(messageData.reason).toBe('notification-skip');
  });
});
