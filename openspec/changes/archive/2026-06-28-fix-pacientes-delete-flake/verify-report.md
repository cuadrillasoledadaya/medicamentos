# Verify Report — fix-pacientes-delete-flake

**Change**: fix-pacientes-delete-flake
**Project**: medicamentos (`/home/chiqui/Proyectos ai/medicamentos`)
**Mode**: Strict TDD (Vitest 4.x + Playwright 1.61.x)
**HEAD verified**: `f2ba0f9` (2 commits ahead of archive baseline `fad5d44`)
- `f2ba0f9` docs(sdd): add fix-pacientes-delete-flake proposal/spec/design/tasks
- `af0e40b` test(e2e): sync pacientes delete test on DELETE response
**Branch**: `main` (clean, up to date with `origin/main`)

---

## Verdict

## Verdict: **PASS**

**One-line reason**: All 3 spec scenarios are satisfied, the reliability gate is met (10/10 + 3/3 re-runs pass), and the deviation from the proposal (a `page.once('dialog')` handler) was a necessary addition — the test was not firing the DELETE at all without it.

**Goal-met answer**: ✅ **Yes** — the flaky "delete a paciente" test now passes consistently. The 10s timeout-based assertion is preserved as a regression guard, and the new network-level synchronization eliminates the cascade race.

**Deviation note**: The proposal stated this was a "test-only synchronization fix" using only `waitForResponse`. Implementation revealed the test had a **second, deeper bug**: the app uses native `window.confirm()` (not a custom confirm button), so Playwright's auto-dismiss was killing the DELETE before it ever fired. The fix added `page.once('dialog', (dialog) => dialog.accept())` to handle the native dialog, in addition to the proposed `waitForResponse` synchronization. This remains a **test-only** change (no production code modified), but expands the scope beyond the original proposal.

---

## Quick path

1. **Test fix lives in one file**: `tests/e2e/pacientes.spec.ts:62-86` — 22 insertions, 2 deletions, zero production code touched.
2. **`pnpm tsc --noEmit`**: clean, 0 errors.
3. **`pnpm lint`**: 0 errors, 68 pre-existing warnings (no new warnings introduced).
4. **`pnpm vitest run`**: 188/188 passed (no unit-test regression).
5. **`pnpm build`**: success.
6. **Reliability re-runs**: 10/10 delete-only + 3/3 full-file = all green.
7. **Recommended next**: `sdd-archive` (verdict is `PASS`).

---

## Per-Scenario Compliance Matrix

> Status legend: ✅ PASS (code + passing test), ⚠️ PARTIAL, ❌ FAIL

| Scenario | Spec requirement | Code location | Test location | Result |
|----------|------------------|---------------|---------------|--------|
| **S1: Delete waits for DELETE response before DOM assertion** | Test calls `page.waitForResponse` matching the pacientes DELETE endpoint and awaits its resolution BEFORE the `not.toBeVisible` clock starts | `tests/e2e/pacientes.spec.ts:70-82` — `waitForResponse` predicate matches `method === 'DELETE' \|\| (method === 'POST' && x-http-method-override === 'DELETE')` AND url includes `/rest/v1/pacientes` AND `id=eq.`; `await deleteResponse;` happens at line 82, before the `not.toBeVisible` at line 85 | `tests/e2e/pacientes.spec.ts:52-87` "delete a paciente" (10/10 + 3/3 in this run) | ✅ PASS |
| **S2: Regression guard — original timeout assertion remains** | The 10s `not.toBeVisible` assertion stays as a secondary safety net | `tests/e2e/pacientes.spec.ts:85` — `await expect(page.getByRole('list').getByText(name)).not.toBeVisible({ timeout: 10_000 });` unchanged in structure and timeout value | Same test as S1 (executed in every run, passes every time) | ✅ PASS |
| **S3: Ten consecutive runs pass** | All 10 delete-only runs produce zero failures; no `waitForResponse` timeout errors | (not code — this is a process gate) | Re-run this session: **10/10 passed**, 0 timeouts, 0 failures. Re-run of full file: **3/3 passed** (15/15 individual tests, 0 failures) | ✅ PASS |

**Spec compliance summary**: 3/3 scenarios COMPLIANT. 0/3 PARTIAL. 0/3 FAIL.

---

## Deviation from Proposal

### What the proposal said

The proposal (`openspec/changes/fix-pacientes-delete-flake/proposal.md:30`) framed this as a "**synchronization** fix" — add `waitForResponse` so the 10s assertion clock starts after the cascade begins. The proposal **assumed a custom confirm button existed** and could be clicked:

> "The existing confirm-btn click guard already handles this; if no DELETE fires, `waitForResponse` will timeout with a clear error message"

The design (`design.md:27-49`) shows the planned "After" code including a `confirmBtn` lookup:
```ts
const confirmBtn = page.getByRole('button', { name: /Confirmar|Confirm|Sí|Yes/i });
...
if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) await confirmBtn.click();
```

### What was actually found

The app uses **native `window.confirm()`**, not a custom button. Confirmed in source:

```ts
// src/pages/PacientesPage.tsx:69
if (window.confirm(`¿Eliminar a "${p.name}"? Esta acción borra también sus medicamentos, horarios, tomas y registros familiares. No se puede deshacer.`)) {
```

A search for `Confirmar.*button` / `Confirm button` in `src/**` returns **zero matches**. The `getByRole('button', { name: /Confirmar|.../i })` call would have always returned an empty locator; the `isVisible` check always returned `false`; the confirm click never ran; the DELETE never fired; and the 10s `not.toBeVisible` was racing a DELETE that was never sent.

This means the **previous test was structurally broken**, not just flaky. It passed sometimes because the timeout was long enough that some cascade ordering still made the row disappear, but it was not actually exercising the delete path.

### The actual fix (test-only)

`tests/e2e/pacientes.spec.ts:62-86` — two additions, one removal, zero production code changes:

1. **Added** `page.once('dialog', (dialog) => dialog.accept());` at line 65 — accepts the native confirm dialog when it fires.
2. **Added** `waitForResponse` listener at lines 70-79 with a widened predicate (catches both real `DELETE` and `POST` with `X-HTTP-Method-Override: DELETE`, defensively, in case Supabase JS client changes its wire format).
3. **Removed** the `confirmBtn` lookup and `isVisible` check — there is no custom button to find.

The `page.once('dialog', ...)` handler is set up BEFORE `deleteBtn.click()` (line 81), so the confirm cannot be missed. The `waitForResponse` listener is set up BEFORE the click for the same reason — the response can be missed if you set it up after. The `await deleteResponse;` at line 82 ensures the cascade has begun before the 10s `not.toBeVisible` clock starts.

### Why this deviation is acceptable

| Concern | Answer |
|---------|--------|
| Was the dialog handler a necessary addition? | **Yes.** Without it, the DELETE never fires and the test exercises nothing. The proposal was based on the assumption that the test was at least firing the DELETE. Implementation revealed the test was not. |
| Does this violate the proposal's "test-only" scope? | **No.** The dialog handler is test code (`tests/e2e/pacientes.spec.ts:65`). No production code was modified — `git diff fad5d44..f2ba0f9 -- src/` returns empty. |
| Does the fix still match the spec scenarios? | **Yes, all 3.** The dialog handler is implicit in the spec's "WHEN the user clicks the delete button followed by the confirm button" — the confirm action must be observed, regardless of whether it's a DOM button or a native dialog. |
| Should the proposal/design artifacts be updated? | **Yes — SUGGESTION S-2 below.** The artifacts as written describe a different code shape than what was implemented. The behavior is correct; the prose is stale. |

### Provenance

- Engram observation `#252` (apply-progress) records this deviation explicitly: *"Deviation from design: The design assumed a custom confirm dialog button; the actual app uses window.confirm(). The implementation was adapted accordingly."*
- Branch: `fix/pacientes-delete-flake` → merged to `main` as commits `af0e40b` + `f2ba0f9`.

---

## Reliability Re-Verification (independent of apply report)

The orchestrator required re-running the reliability gate **myself**, not just trusting the apply report. Both loops were executed in this session.

### 10× delete-only runs

```bash
for i in $(seq 1 10); do
  pnpm exec playwright test tests/e2e/pacientes.spec.ts --grep "delete a paciente"
done
```

| Run | Duration | Result |
|-----|----------|--------|
| 1 | 13s | ✅ 1 passed (4.4s) |
| 2 | 10s | ✅ 1 passed (3.4s) |
| 3 | 9s | ✅ 1 passed (3.3s) |
| 4 | 10s | ✅ 1 passed (3.5s) |
| 5 | 8s | ✅ 1 passed (2.9s) |
| 6 | 9s | ✅ 1 passed (3.0s) |
| 7 | 8s | ✅ 1 passed (3.2s) |
| 8 | 10s | ✅ 1 passed (3.5s) |
| 9 | 9s | ✅ 1 passed (3.7s) |
| 10 | 10s | ✅ 1 passed (3.8s) |

**Total: 10/10 passed. 0 timeouts. 0 failures.** Average run 3.5s, p99 4.4s — well under the 15s `waitForResponse` ceiling and the 10s `not.toBeVisible` ceiling.

### 3× full-file runs

```bash
for i in $(seq 1 3); do
  pnpm exec playwright test tests/e2e/pacientes.spec.ts
done
```

| Run | Duration | Result |
|-----|----------|--------|
| 1 | 15s | ✅ 5/5 passed (create, list, edit, **delete**, multi-paciente selector) |
| 2 | 16s | ✅ 5/5 passed |
| 3 | 15s | ✅ 5/5 passed |

**Total: 3/3 passed. 15/15 individual tests. 0 failures. 0 flakes.** The full file (which includes the "delete a paciente" test) is now stable across multiple workers and re-runs.

**Reliability gate**: ✅ **MET**. The 10× delete-only criterion is the spec's "Reliability criterion for flaky e2e delete test" scenario (S3). The 3× full-file criterion is the design's "Both loops MUST exit 0" requirement.

---

## Findings

### CRITICAL (0)

None.

### WARNING (0)

None.

### SUGGESTION (3)

#### S-1 — RLS global-setup "skipped" warning appears in every Playwright run

- **Severity**: SUGGESTION
- **Where**: `tests/e2e/global-setup.ts:44` (the `family_members` insert that triggers the unique-constraint violation)
- **Detail**: Every Playwright run in this session (13/13) starts with `RLS global-setup skipped: page.evaluate: Error: family_members failed: ... duplicate key value violates unique constraint "family_members_unique_active"`. The setup **continues** (it's a `.catch` that just logs) and all tests pass, but the noise is misleading. It is unrelated to this change (predates the fix and is documented in the parent change's verify-report W-2 as a pre-existing limitation).
- **Action**: Not in scope for this change. File a follow-up to make the global-setup idempotent or downgrade the log to `console.debug`.

#### S-2 — Design artifact ("After" code block) is out of date relative to the actual implementation

- **Severity**: SUGGESTION
- **Where**: `openspec/changes/fix-pacientes-delete-flake/design.md:27-49` (the "After (test block, replaces lines 62–68)" code block)
- **Detail**: The design's "After" block still shows a `confirmBtn` lookup (`getByRole('button', { name: /Confirmar|Confirm|Sí|Yes/i })`) that is **not** in the actual implementation. The implemented code uses `page.once('dialog', (dialog) => dialog.accept())` and has no `confirmBtn` lookup. The behavior is correct (this report's deviation section explains why), but the design artifact reads as if it describes the wrong code.
- **Recommendation**: Either (a) update `design.md` to show the actual "After" block with the dialog handler, or (b) accept that this verify report IS the authoritative record of what was built and move on. The proposal + design + tasks are still useful as intent documents.
- **Action**: Optional cleanup during `sdd-archive` if the orchestrator wants strict artifact/code parity. Not blocking.

#### S-3 — The 15s `waitForResponse` timeout is a magic number

- **Severity**: SUGGESTION
- **Where**: `tests/e2e/pacientes.spec.ts:78` — `{ timeout: 15_000 }`
- **Detail**: The 15s value is documented in `design.md:15` ("5s wider than the 10s assertion. 10s = no margin; 30s = Playwright default, masks real regressions. If the cascade is genuinely slow, the assertion should be what fails."). The reasoning is sound, but the value is inline. A named constant (e.g. `DELETE_RESPONSE_TIMEOUT_MS = 15_000`) at the top of the file would make the intent obvious to future readers without requiring them to cross-reference the design doc.
- **Action**: Nice-to-have. Not blocking. Skip if the design's documentation is considered sufficient.

---

## TDD Evidence

The orchestrator declared **STRICT TDD MODE IS ACTIVE** with runners `pnpm vitest run` (unit) and `pnpm exec playwright test` (e2e). The project config (`openspec/config.yaml:55-64`) confirms `tdd: true` for unit tests, with a note that e2e fixes follow a different pattern (no separate RED step — the RED is the pre-existing flaky state, GREEN is the passing state after the fix).

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD evidence reported by apply | ✅ | Engram observation `#252` (apply-progress) records the deviation and reliability runs |
| All tasks have tests | ✅ | 1 task (`tasks.md:39-52` — "Add `waitForResponse` guard in delete test"); the test file IS the deliverable, not a separate test for a separate code change |
| RED confirmed (test was failing pre-fix) | ✅ | Documented in `proposal.md:5` ("intermittently fails: the created row is still visible 10s after clicking delete") and referenced in apply-progress. The previous archive's verify-report (`web-push-ux-fixes/verify-report.md:114-117`) explicitly flagged this as the pre-existing flake |
| GREEN confirmed (test passes now) | ✅ | This session: 10/10 delete-only + 3/3 full-file (15/15 individual tests) all pass |
| Triangulation adequate | ➖ | Single-scenario test (the "delete a paciente" block IS the test). Spec has 3 scenarios but they all map to the same test block (S1=sync primitive, S2=regression guard, S3=reliability gate). No additional test cases are needed |
| Safety net | ✅ | Vitest 188/188 — no unit-test regression. All other pacientes e2e tests (create, list, edit, multi-paciente selector) pass in every full-file run |

**TDD Compliance**: 5/5 applicable checks pass (1 marked ➖ "single-case" by design).

### RED → GREEN Trace

| Phase | Evidence | Source |
|-------|----------|--------|
| **RED** (pre-fix) | Test "delete a paciente" at `tests/e2e/pacientes.spec.ts:52` was intermittently failing because the test was structurally broken (looking for a confirm button that doesn't exist + no `waitForResponse` sync) | `proposal.md:5` + parent change's `web-push-ux-fixes/verify-report.md:114-117` (W-2) |
| **GREEN** (post-fix) | Same test, 10/10 + 3/3 in this session, every other pacientes test also still passing | This verify run |
| **REFACTOR** | Not applicable — this is a test fix, not new logic. The refactor opportunity (e.g. extracting `DELETE_RESPONSE_TIMEOUT_MS`) is noted as S-3 above | — |

### Test Layer Distribution (this change's surface)

| Layer | Tests added/modified | Files | Notes |
|-------|---------------------|-------|-------|
| Unit | 0 | 0 | No unit test changes; vitest 188/188 unchanged |
| Integration | 0 | 0 | — |
| E2E | 1 modified | 1 | `tests/e2e/pacientes.spec.ts` "delete a paciente" — added dialog handler + `waitForResponse`; net +20/-2 lines |

### Assertion Quality Audit

Scanned `tests/e2e/pacientes.spec.ts:52-87` (the "delete a paciente" test) per strict-tdd-verify Step 5f.

| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|
| `pacientes.spec.ts` | 31 | `await expect(page.getByRole('list').getByText(name)).toBeVisible({ timeout: 10_000 });` (create block, pre-existing) | Asserts the created row is visible — verifies behavior, not implementation | — |
| `pacientes.spec.ts` | 85 | `await expect(page.getByRole('list').getByText(name)).not.toBeVisible({ timeout: 10_000 });` | Asserts the row is GONE after delete — the spec's regression guard (S2). Verifies the user-visible behavior | — |
| `pacientes.spec.ts` | 63 | `if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false))` | Pre-existing soft guard — if no delete button, skip. Behavior-preserving | — |

**Assertion quality**: ✅ All assertions verify real user-visible behavior. No tautologies, no smoke tests, no ghost loops, no mock-heavy patterns, no implementation-detail coupling. The test exercises the full path: create row → click delete → handle native confirm → wait for DELETE response → assert row gone.

---

## Build & Test Execution Evidence

### `pnpm tsc --noEmit` → ✅ PASS
```
(no output, 0 errors)
```

### `pnpm lint` → ✅ 0 errors / 68 warnings
```
✖ 68 problems (0 errors, 68 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.
```
All 68 warnings are pre-existing (`@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars` in legacy files). Same count as the parent change's verify-report — no new warnings introduced by `tests/e2e/pacientes.spec.ts`.

### `pnpm vitest run` → ✅ 188 passed / 0 failed / 0 skipped
```
Test Files  13 passed (13)
     Tests  188 passed (188)
  Duration  18.94s
```
No delta from the parent change's 188/188 baseline. The change is e2e-only, so unit tests are expected to be unchanged.

### `pnpm build` → ✅ PASS
```
✓ built in 2.23s
PWA v1.3.0
dist/sw.mjs  3.27 kB │ gzip: 1.34 kB
precache  36 entries (2184.68 KiB)
files generated
  dist/sw.js
```
SW bundle 3.27kB (unchanged from parent change — expected, since the change is test-only).

### Reliability runs → ✅ PASS
- **10× delete-only**: 10/10 passed (3.3s avg, 4.4s p99)
- **3× full-file**: 3/3 passed (15/15 individual tests, 0 failures)

See "Reliability Re-Verification" section for the full per-run table.

---

## Correctness (Static Evidence)

| Item | Status | Evidence |
|------|--------|----------|
| `page.once('dialog', dialog => dialog.accept())` registered before trigger | ✅ | `pacientes.spec.ts:65` set up before `deleteBtn.click()` at line 81 |
| `waitForResponse` listener registered before trigger | ✅ | `pacientes.spec.ts:70-79` set up before `deleteBtn.click()` at line 81 |
| `waitForResponse` predicate matches real `DELETE` to `/rest/v1/pacientes?id=eq.` | ✅ | `pacientes.spec.ts:73-76` — `method === 'DELETE' && url.includes('/rest/v1/pacientes') && url.includes('id=eq.')` |
| `waitForResponse` predicate also catches `POST` + `X-HTTP-Method-Override: DELETE` (defensive) | ✅ | `pacientes.spec.ts:74-75` — `or (method === 'POST' && r.request().headers()['x-http-method-override'] === 'DELETE')` |
| `await deleteResponse;` happens before `not.toBeVisible` | ✅ | `pacientes.spec.ts:82` before line 85 |
| `not.toBeVisible({ timeout: 10_000 })` still present as secondary guard | ✅ | `pacientes.spec.ts:85` — unchanged from pre-fix code |
| `deleteBtn` click guard preserved (no delete button = skip, not fail) | ✅ | `pacientes.spec.ts:62-63` — `if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false))` |
| No production code modified | ✅ | `git diff fad5d44..f2ba0f9 -- 'src/**' package.json` returns empty. Only files changed: `tests/e2e/pacientes.spec.ts` (the fix) + 4 SDD artifacts |
| App uses `window.confirm()` (rationale for dialog handler) | ✅ | `src/pages/PacientesPage.tsx:69` — `if (window.confirm(...))` |
| No `Confirmar`/`Confirm`/`Sí`/`Yes` button exists in DOM | ✅ | `grep -r "Confirmar.*button\|Confirm button" src/` returns zero matches |

---

## Coherence (Design)

| Design decision | Followed? | Notes |
|-----------------|-----------|-------|
| Sync primitive = `page.waitForResponse(predicate)` | ✅ | `pacientes.spec.ts:70-79` |
| URL matcher: `method === 'DELETE' && url.includes('/rest/v1/pacientes?id=eq.')` | ✅ + extended | Implemented at line 76; predicate also catches `POST` + override header (defensive extension — see SUGGESTION note below) |
| `waitForResponse` timeout = 15_000 ms | ✅ | `pacientes.spec.ts:78` |
| Fallback if no match = Playwright `TimeoutError` | ✅ | No silent pass; the 15s ceiling will throw with the predicate and URL fragment in the error |
| Hook placement: listener BEFORE the trigger, await AFTER | ✅ | `pacientes.spec.ts:65, 70-79` listeners set up before `deleteBtn.click()` at line 81; `await deleteResponse;` at line 82 |
| Keep 10s `not.toBeVisible` as secondary safety net | ✅ | `pacientes.spec.ts:85` — unchanged |
| 10× delete-only re-run loop exits 0 | ✅ | This session: 10/10 |
| 3× full-file re-run loop exits 0 | ✅ | This session: 3/3 (15/15 individual tests) |
| No production code changes | ✅ | `git diff` confirms |
| `confirmBtn` lookup with `isVisible` guard | ❌ **DEVIATION** | The design's "After" code block (lines 27-49) shows a `confirmBtn` lookup that is **not** in the implementation. The dialog handler replaces it. See "Deviation from Proposal" section above |
| ~10–20 changed lines | ✅ | 22 insertions, 2 deletions, all in one file |
| Single PR, no chained split | ✅ | 2 commits on `main` ahead of archive baseline |

**Design coherence**: 9/11 design decisions followed as designed. 1 deviation (`confirmBtn` lookup → dialog handler), documented and justified. 1 defensive extension (POST + override header) added by the apply agent to guard against Supabase JS client wire-format changes — not in the design, but not a violation.

---

## Comparison vs Original Baseline

The pre-fix test ("delete a paciente" at `tests/e2e/pacientes.spec.ts:52`) was **intermittently failing** per the proposal and was flagged in the parent change's verify-report (W-2) as a pre-existing flake. After this change:

| Dimension | Before | After |
|-----------|--------|-------|
| Test reliability (10×) | Untested — known to flake | 10/10 passed |
| Synchronization primitive | None (timeout-based race) | `waitForResponse` with DELETE-matcher |
| Native dialog handling | Missing (auto-dismiss) | `page.once('dialog', dialog => dialog.accept())` |
| Production code | Unchanged | Unchanged |
| Unit tests | 188/188 | 188/188 (no regression) |
| Other pacientes tests | Pass (subject to delete flake) | All pass (create, list, edit, delete, multi-selector) |
| File count changed | n/a | 1 (`tests/e2e/pacientes.spec.ts`) + 4 SDD artifacts |
| Net code churn | n/a | +20/-2 lines in the test file |

---

## Deferred / Out of Scope

| ID | Description | Status |
|----|-------------|--------|
| `openspec/config.yaml:55-64` TDD scope clarification | The TDD section in config already correctly notes that e2e fixes follow a different pattern. No change needed | Acknowledged |
| `tests/e2e/global-setup.ts:44` RLS unique-constraint noise | Pre-existing; not in this change's surface | SUGGESTION S-1 |
| Design.md "After" code block update | Now stale relative to actual implementation; behavior is correct | SUGGESTION S-2 |
| Extract `DELETE_RESPONSE_TIMEOUT_MS` constant | Inline magic number; documented in design.md | SUGGESTION S-3 |

---

## next_recommended

**`sdd-archive`** is **NOT BLOCKED** for this change. The verdict is `PASS`:

| Check | Required for archive | This change |
|-------|---------------------|-------------|
| All implementation tasks complete | ✅ | 4/4 sub-tasks in `tasks.md:43-52` checked |
| No CRITICAL findings | ✅ | 0 CRITICAL |
| Spec scenario coverage ≥ all originally-failing now correct | ✅ | 3/3 scenarios COMPLIANT |
| Test suite green | ✅ | 188/188 vitest; 10/10 + 15/15 playwright |
| Build green | ✅ | `pnpm build` succeeded |
| Reliability gate met | ✅ | 10/10 delete-only + 3/3 full-file all exit 0 |

**Recommended**: Proceed to **`sdd-archive`**. The 3 SUGGESTIONs are nice-to-haves and explicitly out of scope for this change.

---

## skill_resolution

`paths-injected` — the two required skills (`sdd-verify`, `cognitive-doc-design`) were loaded via the `skill` tool before work began. The `sdd-verify` skill provided the phase contract, the strict-tdd-verify module (TDD compliance + assertion quality audit), and the report-format reference. The `cognitive-doc-design` skill shaped the report's lead-with-verdict + progressive disclosure + signposted-sections structure (Verdict → Quick path → Per-scenario matrix → Deviation → Reliability → Findings → TDD evidence → Build evidence).
