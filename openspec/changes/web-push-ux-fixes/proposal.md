# Proposal: web-push-ux-fixes

**This is a follow-up to `web-push-notifications` (archived 2026-06-26).**

## Purpose

Address the known limitations documented in the `web-push-notifications` verify-report that were intentionally deferred from v1:

1. **A12 / A14** — SW does not navigate to `/today` after "Taken" / "Skip" action button tap
2. **A15** — SW does not navigate to `/today` after notification body tap
3. **F-02** — Revoke flow does not call local `PushSubscription.unsubscribe()`

## Context

- See `openspec/changes/archive/2026-06-26-web-push-notifications/verify-report.md` for full details
- See `openspec/changes/archive/2026-06-26-web-push-notifications/archive-report.md` for traces
- The `notifications/spec.md` source-of-truth already includes these requirements; this change implements the missing code

## Scope

- `src/sw.ts`: Add `clients.openWindow('/today')` in `notificationclick` handler for Taken, Skip, and body-tap branches
- `src/features/notifications/DeviceList.tsx` or `api.ts`: Wire `PushSubscription.unsubscribe()` into the Revoke flow

## Out of Scope

- F-03 (duplicate notifications within 5-min window) — acknowledged design tradeoff, v2
- F-04 (SW glue / Edge Function glue unit tests) — coverage improvement, separate change
- F-05 (iPadOS UA misclassification) — suggestion, separate change if needed
- Expanding E2E coverage for 8 skipped tests — infra-dependent
