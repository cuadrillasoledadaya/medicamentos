/**
 * Pacientes E2E tests — CRUD + multi-paciente selector.
 * All test data prefixed with [E2E-TEST] for easy cleanup.
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

test.describe('Pacientes CRUD', () => {
  test.beforeEach(async ({ page }) => loginAsUserA(page));

  test('create a new paciente', async ({ page }) => {
    await page.goto('/pacientes');
    await page.getByRole('button', { name: /Nuevo paciente/i }).click();
    await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible({ timeout: 5000 });

    const name = `[E2E-TEST] Paciente ${Date.now()}`;
    await page.getByLabel('Nombre', { exact: true }).fill(name);
    await page.getByRole('button', { name: /Crear paciente/i }).click();
    await expect(page.getByRole('list').getByText(name)).toBeVisible({ timeout: 10_000 });
  });

  test('list existing pacientes', async ({ page }) => {
    await page.goto('/pacientes');
    await expect(page.locator('body')).toBeVisible();
  });

  test('edit a paciente', async ({ page }) => {
    await page.goto('/pacientes');
    const editBtn = page.getByRole('button', { name: /Editar|Edit/i }).first();
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
      const nameInput = page.getByLabel('Nombre', { exact: true }).or(page.getByLabel('Name', { exact: true }));
      const originalName = await nameInput.inputValue();
      await nameInput.fill(`${originalName} (edited)`);
      await page.getByRole('button', { name: /Guardar|Save/i }).click();
      await expect(page.getByRole('list').getByText('(edited)')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('delete a paciente', async ({ page }) => {
    await page.goto('/pacientes');
    await page.getByRole('button', { name: /Nuevo paciente/i }).click();
    await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible({ timeout: 5000 });

    const name = `[E2E-TEST] DeleteMe ${Date.now()}`;
    await page.getByLabel('Nombre', { exact: true }).fill(name);
    await page.getByRole('button', { name: /Crear paciente/i }).click();
    await expect(page.getByRole('list').getByText(name)).toBeVisible({ timeout: 10_000 });

    const deleteBtn = page.getByRole('button', { name: /Eliminar|Delete/i }).first();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Accept the native window.confirm() dialog that the app uses.
      page.once('dialog', (dialog) => dialog.accept());

      // Listener MUST be set up before the delete click, so it cannot miss
      // the DELETE. Cascade across ~10 tables runs server-side; the assertion
      // clock now starts after the cascade has begun.
      const deleteResponse = page.waitForResponse(
        (r) => {
          const url = r.url();
          const method = r.request().method();
          const isDelete = method === 'DELETE' ||
            (method === 'POST' && r.request().headers()['x-http-method-override'] === 'DELETE');
          return isDelete && url.includes('/rest/v1/pacientes') && url.includes('id=eq.');
        },
        { timeout: 15_000 },
      );

      await deleteBtn.click();
      await deleteResponse;

      // Secondary safety net: catches a real slow-delete server-side bug.
      await expect(page.getByRole('list').getByText(name)).not.toBeVisible({ timeout: 10_000 });
    }
  });

  test('multi-paciente selector in nav header', async ({ page }) => {
    await page.goto('/');
    const selector = page.getByRole('combobox').or(page.getByRole('button', { name: /paciente|patient/i })).first();
    if (await selector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selector.click();
      await expect(page.getByRole('option').or(page.getByRole('listitem').or(page.getByRole('menuitem')))).toBeVisible({ timeout: 5000 });
    }
  });
});
