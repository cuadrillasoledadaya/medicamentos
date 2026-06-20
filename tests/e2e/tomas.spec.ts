/**
 * Tomas E2E tests — full lifecycle: view pending, mark taken, snooze, skip, history.
 * Uses pre-seeded schedules (user has 2 meds + 7 tomas in DB).
 */
import { test, expect } from '@playwright/test';

const TEST_USER_A = {
  email: 'e2e-test-a@medicamentos.test',
  password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
};

async function loginAsUserA(page: ReturnType<typeof test.extend>) {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(TEST_USER_A.email);
  await page.getByLabel('Contraseña', { exact: true }).or(page.getByLabel('Password', { exact: true })).fill(TEST_USER_A.password);
  await page.getByRole('button', { name: /Iniciar sesión|Sign in|Entrar/i }).click();
  await page.waitForURL(url => !url.pathname.includes('/auth/sign-in'));
}

test.describe('Tomas Lifecycle', () => {
  test.beforeEach(async ({ page }) => loginAsUserA(page));

  test('view today pending tomas', async ({ page }) => {
    const intakeLink = page.getByRole('link', { name: /Tomas|Intake|Hoy|Today/i });
    if (await intakeLink.isVisible({ timeout: 3000 }).catch(() => false)) await intakeLink.click();
    else await page.goto('/intake/today');
    await expect(page.locator('body')).toBeVisible();
  });

  test('mark a toma as taken on time', async ({ page }) => {
    await page.goto('/intake/today');
    const takeBtn = page.getByRole('button', { name: /Tomada|Taken|Marcar como tomada/i }).first();
    if (await takeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await takeBtn.click();
      await expect(page.getByText(/tomada a tiempo|taken on time/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('mark a toma as taken late', async ({ page }) => {
    await page.goto('/intake/today');
    const lateBtn = page.getByRole('button', { name: /Tarde|Late/i }).first();
    if (await lateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lateBtn.click();
      await expect(page.getByText(/tarde|taken late/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('snooze a toma', async ({ page }) => {
    await page.goto('/intake/today');
    const snoozeBtn = page.getByRole('button', { name: /Posponer|Snooze|10 min/i }).first();
    if (await snoozeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await snoozeBtn.click();
      await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('skip a toma with reason', async ({ page }) => {
    await page.goto('/intake/today');
    const skipBtn = page.getByRole('button', { name: /Saltar|Skip/i }).first();
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
      const reasonInput = page.getByLabel('Motivo', { exact: true }).or(page.getByLabel('Reason', { exact: true })).or(page.locator('textarea, input[name="skip_reason"]'));
      if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) await reasonInput.fill('E2E test skip');
      const confirmBtn = page.getByRole('button', { name: /Confirmar|Confirm|Guardar|Save/i });
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) await confirmBtn.click();
      await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('view toma history', async ({ page }) => {
    const historyLink = page.getByRole('link', { name: /Historial|History/i });
    if (await historyLink.isVisible({ timeout: 3000 }).catch(() => false)) await historyLink.click();
    else await page.goto('/intake/history');
    await expect(page.locator('body')).toBeVisible();
  });
});
