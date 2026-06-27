# Verdict: PASS

| Field | Value |
|-------|-------|
| **Date** | 2026-06-28 |
| **Change** | fix-pacientes-delete-flake |
| **Artifact store** | hybrid (filesystem + Engram) |
| **Final main SHA** | `f2ba0f9` |
| **Verdict (verify)** | PASS — 0 CRITICAL, 0 WARNING, 3 SUGGESTION |
| **Goal met** | ✅ Yes — the flaky "delete a paciente" test now passes 10/10 + 3/3 reliability |
| **Delivery strategy** | `force-chained`, `stacked-to-main` (single commit) |

## Quick path

1. The e2e delete test `tests/e2e/pacientes.spec.ts:52` was structurally broken: it looked for a custom confirm button that doesn't exist (the app uses native `window.confirm()`), so the DELETE never fired. Fix: `page.once('dialog', dialog => dialog.accept())` + `waitForResponse` sync.
2. No source-of-truth spec sync needed — change is test-only (no e2e testability source-of-truth spec exists).
3. Change folder moved to `openspec/changes/archive/2026-06-28-fix-pacientes-delete-flake/`.
4. Archive report written and persisted to Engram.

## Commit Landed

| SHA | Branch | Message |
|-----|--------|---------|
| `af0e40b` | `fix/pacientes-delete-flake` (fast-forwarded to main as part of `f2ba0f9`) | `test(e2e): sync pacientes delete test on DELETE response` |

The fix was a single commit on `fix/pacientes-delete-flake`, fast-forward merged to `main` as `f2ba0f9` (which also includes the SDD artifacts commit).

## Deviations from Original Proposal

### Deviation 1: Native `window.confirm()` dialog handler

The **proposal** (line 30) assumed a custom confirm button existed:

> "Add `await page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().includes('pacientes'))` after clicking confirm..."

The **design** (lines 27–49) showed a `confirmBtn` lookup with `getByRole('button', { name: /Confirmar|Confirm|Sí|Yes/i })`.

**Reality**: The app uses native `window.confirm()` (`src/pages/PacientesPage.tsx:69`). No `Confirmar`/`Confirm`/`Sí`/`Yes` button exists in the DOM. Playwright auto-dismisses native dialogs by default, so the DELETE never fired. The fix added `page.once('dialog', (dialog) => dialog.accept())` before the delete button click — a **necessary addition** without which the test was structurally broken, not merely flaky.

### Deviation 2: Widened `waitForResponse` predicate for Supabase wire format

The **proposal** and **design** specified a predicate matching `method === 'DELETE'`.

**Reality**: Supabase JS client v2.108+ may use `POST` with `X-HTTP-Method-Override: DELETE` instead of a real `DELETE` request. The predicate was widened to:

```ts
const isDelete = method === 'DELETE' ||
  (method === 'POST' && r.request().headers()['x-http-method-override'] === 'DELETE');
return isDelete && url.includes('/rest/v1/pacientes') && url.includes('id=eq.');
```

This is a **defensive extension** — the existing wire format uses real `DELETE`, but the wider predicate guards against future client upgrades without a test change. Not a violation of the design, just a safety margin.

### Why deviations are acceptable

| Concern | Answer |
|---------|--------|
| Are deviations still test-only? | **Yes.** Both additions are in `tests/e2e/pacientes.spec.ts`. No production code modified — `git diff fad5d44..f2ba0f9 -- src/` is empty. |
| Do deviations match the spec scenarios? | **Yes, all 3.** The dialog handler is implicit in "WHEN the user clicks the delete button followed by the confirm button." The widened predicate still matches the DELETE endpoint. |
| Was the test structurally broken before? | **Yes.** Without the dialog handler, the DELETE never fired. The pre-fix "pass" was coincidental — the test was not exercising the delete path. |

## Reliability Re-Runs

| Run type | Attempts | Result |
|----------|----------|--------|
| Single-test (`--grep "delete a paciente"`) | 10/10 | ✅ All passed (avg 3.5s, p99 4.4s) |
| Full-file (`tests/e2e/pacientes.spec.ts`) | 3/3 | ✅ All passed (15/15 individual tests, 0 failures) |

**Reliability gate**: ✅ MET. Well under the 15s `waitForResponse` ceiling and the 10s `not.toBeVisible` ceiling.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| (none) | No sync needed | Change is test-only. No e2e testability source-of-truth spec exists in `openspec/specs/`. |

## SUGGESTIONs from Verify Report

| ID | Description | Status |
|----|-------------|--------|
| S-1 | RLS global-setup "skipped" warning appears in every Playwright run | **Pre-existing** — unrelated to this change. Not addressed. |
| S-2 | `design.md` "After" code block is stale — still shows `confirmBtn` lookup | **Fixed** (by orchestrator during archive ramp). The design artifact now shows the actual implementation including `page.once('dialog')`. |
| S-3 | 15s `waitForResponse` timeout is an inline magic number | **Optional** — documented in `design.md:15`. Nice-to-have constant extraction, not blocking. |

Full findings detail in `verify-report.md` in this archive directory.

## Archived Artifacts

| Artifact | Status |
|----------|--------|
| `proposal.md` | ✅ Archived |
| `spec.md` | ✅ Archived (delta spec) |
| `design.md` | ✅ Archived (updated for code parity) |
| `tasks.md` | ✅ Archived (4/4 sub-tasks complete) |
| `verify-report.md` | ✅ Archived (PASS) |
| `archive-report.md` | ✅ This file |

## Source of Truth

No source-of-truth spec was updated — the change is e2e-test-only and no e2e testability source-of-truth spec exists in `openspec/specs/`.

## Engram Persistence

This archive report is also persisted to Engram at topic_key `sdd/fix-pacientes-delete-flake/archive-report` for cross-session traceability.

## Verification Summary (carried from verify)

| Check | Result |
|-------|--------|
| `pnpm tsc --noEmit` | ✅ 0 errors |
| `pnpm lint` | ✅ 0 errors (68 pre-existing warnings) |
| `pnpm vitest run` | ✅ 188/188 passed |
| `pnpm build` | ✅ Success |
| Spec compliance | 3/3 scenarios COMPLIANT |
| Reliability gate | 10/10 + 3/3 all green |

---

*End of archive report. Change cycle complete.*
