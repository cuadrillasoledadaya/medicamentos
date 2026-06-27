# Tasks: Web Push UX Fixes

## Stack & Conventions

| Dimension | Value |
|-----------|-------|
| Test runner | Vitest 4.x (`pnpm vitest run`) |
| Strict TDD | **Active** — RED before GREEN per task |
| Typecheck | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| Commit style | Conventional commits, no Co-Authored-By |
| Branch style | `fix/web-push-ux-pr<N>` (stacked-to-main) |

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~75 (15 SW + 60 revoke) |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (SW nav) → PR 2 (revoke unsubscribe) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

**Rationale for 2 PRs**: SW notification routing (production runtime) and revoke unsubscribe (UI+storage) touch different concerns in different execution contexts. Isolating them protects independent rollback. `force-chained` strategy confirmed.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | SW navigation on notification click | PR 1 → main | `src/sw.ts` only, no new tests |
| 2 | Revoke flow local unsubscribe | PR 2 → main | `DeviceList.tsx` + 2 test cases |

---

## PR 1: SW Navigation on Notification Click

- [x] 1.1 Replace combined guard in `src/sw.ts:160`: `!action` → `clients.openWindow('/today')`, `!tomaId` → return (A15)
- [x] 1.2 Add `clients.openWindow('/today')` after `postMessage` in `src/sw.ts:167` "taken" case (A12)
- [x] 1.3 Add `clients.openWindow('/today')` after `postMessage` in `src/sw.ts:175` "skip" case (A14)
- [x] 1.4 Verify: `pnpm tsc --noEmit`, `pnpm vitest run`, `pnpm lint` — all clean
- [x] 1.5 Commit as `fix(sw): navigate to /today on notification click (taken/skip/body-tap)`
- [x] 1.6 Rollback: revert that single commit on `src/sw.ts`

## PR 2: Revoke Flow Local Unsubscribe

- [x] 2.1 **RED**: Write failing test — "calls `unsubscribeFromPush` when local subscription matches revoked endpoint" in `DeviceList.test.tsx`
- [x] 2.2 **RED**: Write failing test — "proceeds with server revoke when local subscription is missing" in `DeviceList.test.tsx`
- [x] 2.3 **GREEN**: Import `unsubscribeFromPush` in `DeviceList.tsx` (already exported from `pushSubscription.ts:135`)
- [x] 2.4 **GREEN**: Rewrite `handleConfirmRevoke` in `DeviceList.tsx:78-83` — local unsubscribe with endpoint match + try/catch, ALWAYS run server mutation
- [x] 2.5 **GREEN**: Update mock in `DeviceList.test.tsx:19-21` to expose `unsubscribeFromPush`
- [x] 2.6 Verify: `pnpm vitest run` passes (both new + 7 existing), `pnpm tsc --noEmit`, `pnpm lint`
- [x] 2.7 Commit as `fix(notifications): unsubscribe local PushSubscription before server revoke`
- [x] 2.8 Rollback: revert that single commit (covers `DeviceList.tsx` + `DeviceList.test.tsx`)
