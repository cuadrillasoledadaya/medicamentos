# Design: fix-pacientes-delete-flake

## Technical Approach

Synchronize the e2e delete test on the actual Supabase REST `DELETE` response for the `pacientes` table before asserting the row disappeared. Today the 10s `not.toBeVisible` clock starts at click time and races against a server-side cascade across ~10 tables plus the React Query refetch. The fix moves the clock forward by `await`ing the network response.

Scope: single file, `tests/e2e/pacientes.spec.ts` lines 62–68. No production code changes.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Sync primitive | `page.waitForResponse(predicate)` | Most precise signal that the exact mutation completed server-side; `networkidle` is ambiguous when parallel queries fire. |
| URL matcher | method `DELETE` AND url includes `/rest/v1/pacientes?id=eq.` | `.from('pacientes').delete().eq('id', id)` produces `?id=eq.{uuid}` (confirmed in `tests/e2e/rls.spec.ts:157`). Cascade is DB-side, so we target the pacientes DELETE only. |
| `waitForResponse` timeout | `15_000` ms | 5s wider than the 10s assertion. 10s = no margin; 30s = Playwright default, masks real regressions. If the cascade is genuinely slow, the assertion should be what fails. |
| Fallback if no match | Let Playwright throw `TimeoutError` | Silent pass is unacceptable. The error names the predicate and waited-on URL fragment. |
| Hook placement | `deleteResponse = page.waitForResponse(...)` set up **before** the confirm click, then `await` after the click | Promise-must-precede-the-trigger pattern; otherwise the response can be missed. |

## File Changes

| File | Action | Description |
|---|---|---|
| `tests/e2e/pacientes.spec.ts` | Modify | Insert `deleteResponse` before the confirm click; await it after; keep the 10s `not.toBeVisible` as a secondary safety net. |

## After (test block, replaces lines 62–68)

```ts
const deleteBtn = page.getByRole('button', { name: /Eliminar|Delete/i }).first();
if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  // The app uses native window.confirm() (see src/pages/PacientesPage.tsx),
  // NOT a custom in-DOM confirm button. Accept the dialog before clicking.
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
```

> **Implementation note (added at archive time)**: the original `confirmBtn` lookup assumed a custom in-DOM confirm button. The app uses the native `window.confirm()` browser dialog, so that lookup is removed and a `page.once('dialog', dialog => dialog.accept())` handler is set up before the click. The `waitForResponse` predicate is also widened to catch `POST` with `X-HTTP-Method-override: DELETE`, which Supabase JS client v2.108+ may use. Both deviations are documented in `verify-report.md` and are necessary for the test to actually fire the DELETE.

## Timeout Strategy

- `waitForResponse`: **15s** (5s margin over the 10s assertion; if cascade exceeds 10s, the assertion fails — real signal, not a sync-primitive timeout).
- `not.toBeVisible`: **unchanged at 10s** — regression guard per spec scenario "Regression guard — original timeout assertion remains".
- **Fallback if no match**: Playwright throws `TimeoutError` naming the predicate and URL fragment. No silent pass. Protects against URL drift (e.g. Supabase JS client changes the filter format).

## Test Re-Run Strategy

```bash
# 10 consecutive runs of just the delete test
for i in $(seq 1 10); do
  pnpm exec playwright test tests/e2e/pacientes.spec.ts --grep "delete a paciente"
done

# 3 consecutive runs of the full pacientes spec file
for i in $(seq 1 3); do
  pnpm exec playwright test tests/e2e/pacientes.spec.ts
done
```

Both loops MUST exit 0. Any non-zero exit (timeout, assertion, hook failure) is a hard fail of verification.

## Risks

- **URL pattern drift** — if `@supabase/supabase-js` ever changes the `id=eq.{uuid}` encoding, the predicate matches nothing and Playwright times out at 15s. The error is loud, so the CI fix is to update the predicate.
- **15s too tight under load** — if cascade latency grows past 15s, the test flakes again. Surface a follow-up to investigate the cascade (likely RLS or index), do not silently widen the timeout.
- **Parallel test pollution** — other tests issuing DELETEs on non-pacientes tables are correctly ignored by the URL fragment.
