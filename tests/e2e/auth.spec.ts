/**
 * Auth E2E tests — sign-in, sign-out, ProtectedRoute redirect, session persistence.
 * Requires two test users in Supabase Auth Dashboard.
 * See tests/e2e/README.md for setup instructions.
 */
import { test, expect } from '@playwright/test';

const TEST_USER_A = {
  email: 'e2e-test-a@medicamentos.test',
  password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
};

const loginLabel = /Contraseña|Password/i;
const submitLabel = /Iniciar sesión|Sign in|Entrar/i;

test.describe('Authentication', () => {
  test('sign-in with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER_A.email);
    await page.getByLabel(loginLabel).fill(TEST_USER_A.password);
    await page.getByRole('button', { name: submitLabel }).click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('sign-out redirects to login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER_A.email);
    await page.getByLabel(loginLabel).fill(TEST_USER_A.password);
    await page.getByRole('button', { name: submitLabel }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.getByRole('button', { name: /Cerrar sesión|Logout|Sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('session persists on page reload', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER_A.email);
    await page.getByLabel(loginLabel).fill(TEST_USER_A.password);
    await page.getByRole('button', { name: submitLabel }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    const currentUrl = page.url();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(currentUrl);
  });

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nonexistent@example.com');
    await page.getByLabel(loginLabel).fill('wrongpassword');
    await page.getByRole('button', { name: submitLabel }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|incorrect|error|no se encontró|credenciales/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
