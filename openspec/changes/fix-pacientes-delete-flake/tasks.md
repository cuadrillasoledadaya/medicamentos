# Tasks: Fix pacientes delete flake

## Stack & Conventions

| Dimension | Value |
|---|---|
| Test runner | Vitest 4.x + Playwright 1.61.x |
| Strict TDD | **Active** for unit tests; e2e fix follows different pattern (see note) |
| Typecheck | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| Commit style | Conventional commits, no Co-Authored-By |

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~10–20 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

**Single PR rationale**: One file, ~10 changed lines, test-only fix. Chained PRs add overhead with zero risk benefit — a single commit is trivially revertible with no data or schema impact.

### TDD Note

This is an e2e test fix, not new logic. There is no separate RED step because the failure **already exists** (line 52, flaky). The RED is the pre-existing flaky state; the GREEN is the passing state after the fix. `strict_tdd` in `openspec/config.yaml:55` governs unit-test RED-GREEN-REFACTOR; this change applies only to Playwright e2e, which has no equivalent RED step.

---

## Phase 1: Flake Fix

### Task 1.1 — Add `waitForResponse` guard in delete test

**File**: `tests/e2e/pacientes.spec.ts`, around lines 62–68 (the "delete a paciente" block).

- [x] 1.1 **Set up listener**: Before the confirm click (line 65), instantiate:
  ```ts
  const deleteResponse = page.waitForResponse(
    (r) => r.request().method() === 'DELETE' && r.url().includes('/rest/v1/pacientes?id=eq.'),
    { timeout: 15_000 },
  );
  ```
- [x] 1.2 **Click confirm**: Unchanged — `if (await confirmBtn.isVisible(...)) await confirmBtn.click()`
- [x] 1.3 **Await response**: Insert `await deleteResponse;` after the confirm click, before `not.toBeVisible`
- [x] 1.4 **Keep safety net**: The existing `not.toBeVisible({ timeout: 10_000 })` stays as secondary guard (spec scenario "Regression guard")

### Test Plan

```bash
# 10 consecutive delete-only runs — all must exit 0
for i in $(seq 1 10); do
  pnpm exec playwright test tests/e2e/pacientes.spec.ts --grep "delete a paciente"
done

# 3 consecutive full-file runs — all must exit 0
for i in $(seq 1 3); do
  pnpm exec playwright test tests/e2e/pacientes.spec.ts
done
```

### Verification

| Check | Command |
|---|---|
| TypeScript | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| Unit tests | `pnpm vitest run` |
| E2E re-run 1 | 10× delete-only loop exits 0 |
| E2E re-run 2 | 3× full-file loop exits 0 |

### Rollback

Revert the single commit modifying `tests/e2e/pacientes.spec.ts`. No data migration, no schema change, no production code.
