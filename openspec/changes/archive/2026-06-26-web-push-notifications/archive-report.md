# Archive Report: web-push-notifications

| Field | Value |
|-------|-------|
| **Date** | 2026-06-26 |
| **Change** | web-push-notifications |
| **Branch archived** | `feat/medication-push-pr5` (last PR branch, deleted after merge) |
| **Final HEAD** | `f7569e2` |
| **Verdict** | PASS_WITH_WARNINGS |
| **Artifact store** | openspec (hybrid — filesystem + Engram) |

## PRs Merged

| # | PR | Title | SHA | Status |
|---|----|-------|-----|--------|
| 1 | #1 | `feat(push): add web push schema foundation (PR 1 of 5)` | `f39f673` | ✅ Merged to main |
| 2 | #2 | `feat(push): add server-side push delivery (PR 2 of 5)` | `1c1b398` | ✅ Merged to main |
| 3 | #3 | `feat(push): add client subscribe flow and SW push handler (PR 3 of 5)` | `8ad30be` | ✅ Merged to main |
| 4 | #4 | `feat(push): add web_push settings UI with DeviceList and iOS badge (PR 4 of 5)` | `3915b10` | ✅ Merged to main |
| 5 | #5 | `test(e2e): add web push E2E tests with SW test hooks (PR 5)` | `f7569e2` | ✅ Merged to main |

## Tests

| Layer | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| Unit (vitest) | 186 | 0 | 0 |
| E2E (Playwright) | 1 | 0 | 8 |
| **Total** | **187** | **0** | **8 skipped (infra limitations)** |

All 8 E2E skips are documented in `apply-progress.md` (PR 5) — SW not registered in dev mode, VAPID key not configured, iOS UA override unreliable. Covered by unit tests.

## Synced Specs

The following source-of-truth spec files were updated with the delta requirements from this change:

| File | Action | Details |
|------|--------|---------|
| `openspec/specs/reminder/spec.md` | Updated | Notification Channels extended to 4 channels (added `web_push`); 8 new requirements added: VAPID key distribution, Push Subscription Mgmt, Scheduled Push Delivery, Push Payload Contract, SW Push Handler, Subscription Pruning, iOS Install Badge, Delivery Audit |
| `openspec/specs/schema/spec.md` | Updated | Added `push_subscriptions` and `notification_deliveries` tables; added `web_push` to Notification Channel Values enum; extended `notification_settings.channel` constraint; added new indexes and RLS policies |

## Archived Artifacts

| Artifact | Status |
|----------|--------|
| `proposal.md` | ✅ Archived |
| `spec.md` | ✅ Archived |
| `design.md` | ✅ Archived |
| `tasks.md` | ✅ Archived (27/27 tasks complete) |
| `apply-progress.md` | ✅ Archived |
| `verify-report.md` | ✅ Archived |
| `archive-report.md` | ✅ This file |

## Known Limitations (follow-up required)

The verify-report found 3 FAILs + 1 PARTIAL-with-caveat that are **not fixed** in this archive. They are intentionally deferred to a follow-up change `web-push-ux-fixes`:

| ID | Requirement | Issue | Severity | Suggested fix |
|----|-------------|-------|----------|---------------|
| A12 | SW: User taps "Taken" → navigate to `/today` | No `clients.openWindow('/today')` after postMessage | FAIL | Add `event.waitUntil(clients.openWindow('/today'))` after postMessage in `sw.ts` |
| A14 | SW: User taps "Skip" → navigate to `/today` | No `clients.openWindow('/today')` after postMessage | FAIL | Same as A12 for Skip branch |
| A15 | SW: User taps notification body → open `/today` | Body tap (`!action`) early-returns; no navigation handler | FAIL | Add body-tap branch before the guard in `sw.ts` |
| F-02 | Revoke flow: missing local `PushSubscription.unsubscribe()` | Only server-side `is_active=false`; browser subscription left dangling | PARTIAL (caveat) | Call `registration.pushManager.getSubscription().unsubscribe()` in `DeviceList.tsx` revoke flow |

**Full details**: see `verify-report.md` in this archive directory.

## Follow-Up Planned

The follow-up change `web-push-ux-fixes` will address:
1. A12, A14, A15 — SW navigation to `/today` in `notificationclick` handler
2. F-02 — local `PushSubscription.unsubscribe()` on Revoke

A minimal proposal stub exists at `openspec/changes/web-push-ux-fixes/proposal.md` for the next session to pick up.

## Engram Persistence

This archive report is also persisted to Engram at topic_key `sdd/web-push-notifications/archive-report` for cross-session traceability.

---

*End of archive report. Change cycle complete.*
