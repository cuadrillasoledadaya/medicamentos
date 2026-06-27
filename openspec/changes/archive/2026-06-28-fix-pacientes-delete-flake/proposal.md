# Proposal: Fix pacientes delete flake

## Intent

`tests/e2e/pacientes.spec.ts:52` "delete a paciente" intermittently fails: the created row is still visible 10s after clicking delete. This is a **pre-existing test-only flake** — the delete behavior is correct (Supabase DELETE + `invalidateQueries`), but the test assertion is brittle.

## Scope

### In Scope
- Fix the delete test assertion in `tests/e2e/pacientes.spec.ts` to wait for the actual DELETE HTTP response before asserting row disappearance
- Verify the fix by running the test 10 consecutive times

### Out of Scope
- Refactoring PacientesPage, hooks, or API layer
- Changes to other e2e tests
- New paciente features

## Capabilities

### New Capabilities
None

### Modified Capabilities
None

## Approach

**Root cause**: The test asserts `not.toBeVisible({ timeout: 10_000 })` without synchronizing on the actual Supabase DELETE request. The delete triggers a cascade across ~10 tables, then `invalidateQueries` refetches, then React re-renders. Under load, this chain can exceed 10s.

**Fix**: Add `await page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().includes('pacientes'))` after clicking confirm, before asserting `not.toBeVisible()`. This guarantees the server-side delete completed before checking the DOM.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/e2e/pacientes.spec.ts:64-67` | Modified | Add `waitForResponse` guard before the `not.toBeVisible` assertion |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `waitForResponse` times out if DELETE never fires (e.g. confirm dialog fails) | Low | The existing confirm-btn click guard already handles this; if no DELETE fires, `waitForResponse` will timeout with a clear error message |
| Masking a real slow-delete bug | Low | The 10s `not.toBeVisible` timeout remains as a secondary safety net; if the row persists after DELETE response, the test still fails |

## Rollback Plan

Revert the single commit that modifies `tests/e2e/pacientes.spec.ts`. No schema, API, or production code changes.

## Dependencies

- None

## Success Criteria

- [ ] `pacientes.spec.ts` "delete a paciente" passes 10 consecutive runs without failure
- [ ] All other pacientes tests remain green
- [ ] `pnpm exec playwright test tests/e2e/pacientes.spec.ts` shows 0 failures
