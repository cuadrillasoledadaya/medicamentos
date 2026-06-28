# Tasks: fix-sw-workbox-injection

## Stack & Conventions

| Dimension | Value |
|---|---|
| Test runner | Vitest 4.x (`pnpm vitest run`) + Playwright 1.61.x (`pnpm test:e2e`) |
| Strict TDD | Active — RED→GREEN for new code |
| Typecheck | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| Build | `pnpm build` |

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~34 (+8/−26) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Work-Unit Commit Plan

All 3 commits on the same single-PR branch.

### Task 1 — `chore(sw): convert workbox globals to ES module imports`

**Files**: `src/sw.ts:5-13` (−9/+4)
**TDD**: None (build config change, no test behavior)
**Accept**: `pnpm build` succeeds (imports resolve despite missing deps — SW fails at runtime, not build)
**Risk**: None (mechanical substitution)

### Task 2 — `chore(deps): add workbox runtime deps at ^7.4.1`

**Files**: `package.json` (+4), `pnpm-lock.yaml` (auto-regen)
**TDD**: None
**Accept**: `pnpm build` bundles workbox into `dist/sw.js`; `pnpm vitest run` passes (199/199 baseline)
**Risk**: Low — version mismatch if lockfile conflict (mitigation: same `^7.4.1` as `workbox-window`)

### Task 3 — `chore(build): remove dead workbox runtimeCaching block`

**Files**: `vite.config.ts:54-70` (−17)
**TDD**: None
**Accept**: `pnpm build` succeeds, `dist/sw.js` content identical (block was a no-op in `injectManifest` mode)
**Risk**: None

### Build Verification — confirm fix end-to-end

**No commit** — run after all 3 commits applied:
1. `pnpm build` exits 0, produces `dist/sw.js`
2. `head -5 dist/sw.js` — first line is `import {` not `var...=workbox.`
3. `grep -c 'workbox\..*[^;]$' dist/sw.js | grep -q 0` — no `workbox.` expression outside import scope
4. `grep -c 'precacheAndRoute' dist/sw.js | grep -q 1` — `precacheAndRoute(...)` present
5. `grep -c 'registerRoute' dist/sw.js | grep -q 1` — `registerRoute(...)` present

## Verification

| Check | Command |
|---|---|
| Unit tests | `pnpm vitest run` |
| Typecheck | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| Build | `pnpm build` |
| SW bundle | `grep -c "workbox\\." dist/sw.js \|\| true` — expect 0 |
| SW imports | `head -5 dist/sw.js` — expect `import {` |

## Rollback

Revert commits in reverse (3→1). Each independently revertable. No migrations or data changes.

## Definition of Done

- [x] All 3 commits applied and pushed
- [x] `pnpm build` succeeds, `dist/sw.js` has no `workbox.` global reference
- [x] `package.json` has `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration` at `^7.4.1`
- [x] `vite.config.ts` no longer has `workbox: { runtimeCaching }` block
- [ ] `pnpm vitest run` passes (199/199 baseline)
- [ ] `pnpm tsc --noEmit` clean, `pnpm lint` clean
- [ ] Manual smoke: hard-refresh /notifications, toggle web_push, browser prompt appears
