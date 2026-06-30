<!-- Synced from openspec/changes/snooze-push-alerts/specs/snooze-retrigger/spec.md on 2026-07-01. Source-of-truth delta. -->
# Spec: snooze-retrigger (NEW)

## Purpose

Ensures a snoozed toma (`snoozed_until IS NOT NULL`) is re-pushed via the same Edge Function flow as the original push when its snooze window expires, so the user is reminded again at the snooze expiry time. Reuses the existing 1-minute pg_cron, the existing `notify-fallback` Edge Function, and the existing SW tag-based dedup.

## Requirements (4)

### R1: `tomas_due_for_push` SHALL surface tomas whose `snoozed_until` expired in the last minute

The view SHALL include pending tomas whose `snoozed_until` falls in `[now() - 1 minute, now()]`, in addition to the original 5-minute window. 1-minute grace prevents the 60-second cron cadence from missing a re-trigger by more than ~1 minute.

#### Scenarios
- Pending toma, `snoozed_until = now() - 30s` → appears in view exactly once; original 5-min window still applies to non-snoozed tomas.
- Pending toma, `snoozed_until = now() - 5 min` → NOT in view.
- Toma in overlap of original + snoozed windows → appears exactly once (no UNION duplication).

### R2: The 1-minute pg_cron SHALL fire a re-push via `notify-fallback`

`materialize_due_pushes()` SHALL dispatch a Web Push to every active subscription for each active family member, using the same `buildPushPayload` schema (including the 4 alert-behavior flags and the real `action_url` route).

#### Scenarios
- Pending toma, `snoozed_until = now() - 30s`, one active family member with one active subscription → cron calls `notify-fallback` once; `notification_deliveries` row inserted with `status = 'success'`.

### R3: Re-pushed tomas SHALL be deduplicated by `toma_id` at the SW

SW `push` handler SHALL tag with `notification_id = toma_id`; when same tag is visible, SW closes the existing one and shows the new one (replacement, not duplication).

#### Scenarios
- Notification with `tag = toma-X` visible + new push for `toma-X` arrives → prior is closed, fresh notification displayed with same tag.

### R4: The re-push SHALL NOT fire for tomas that are no longer `pending`

The `status = 'pending'` predicate is the guard. Taken / skipped tomas are excluded regardless of `snoozed_until`.

#### Scenarios
- Toma with `status = 'taken'` and `snoozed_until = now() - 30s` → no push.
- Toma with `status = 'skipped'` and `snoozed_until = now() - 30s` → no push.
- Toma was snoozed → re-pushed at +10 min → user marked taken → subsequent crons send nothing.
