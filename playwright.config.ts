import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Medicamentos PWA E2E tests.
 *
 * The webServer config auto-starts `pnpm dev` so that running `pnpm test:e2e`
 * boots the dev server automatically. reuseExistingServer avoids restarting
 * when the dev server is already running locally.
 *
 * Test users (created in Supabase Auth Dashboard):
 *   e2e-test-a@medicamentos.test  — user A (owns test data)
 *   e2e-test-b@medicamentos.test  — user B (RLS isolation target)
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
