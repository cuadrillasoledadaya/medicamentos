# Design: web-push-notifications

## Technical Approach

Extend the existing `notify-fallback` Edge Function with a `web-push` (VAPID) delivery branch, drive that branch from a new 60-second `pg_cron` job that scans a window-aligned view of `tomas`, and give the existing Service Worker a real `push` handler that shows an action-buttoned notification and routes taps back to the existing toma-update endpoints. Frontend adds a VAPID-key subscription flow and a per-device management UI in `NotificationSettingsForm`. No change to the existing INSERT-triggered email/SMS path; web push is a parallel, time-driven flow.

## Sequence Diagrams

### (a) First-time subscription

```
User  → NotificationSettingsForm
       → requestNotificationPermission()                (existing)
       → pushManager.subscribe({userVisibleOnly:true,
                                applicationServerKey: VITE_VAPID_PUBLIC_KEY})
       → supabase.from('push_subscriptions').insert({
            user_id, endpoint, p256dh, auth, device_name, is_active=true })
       ← RLS: user_id = auth.uid() (own rows only)
       → UI: badge "Push active on this device"
```

### (b) Time-aware push (cron → Edge Function → push service)

```
pg_cron  → materialize_due_pushes()                  (every 60s)
            SELECT tomas WHERE status='pending'
              AND scheduled_at <= now()
              AND scheduled_at >  now() - interval '5 minutes'
            → for each: get_active_push_subscribers(paciente_id)
                        → net.http_post notify-fallback {tomaId,...}
notify-fallback → for each subscription row:
                   webpush.sendNotification(sub, payload, vapidOptions)
                   ↳ 200 → INSERT notification_deliveries success
                   ↳ 410/404 → UPDATE push_subscriptions SET is_active=false
                                INSERT notification_deliveries failure
SW push event → payload parse → showNotification (tag = notification_id)
```

### (c) Push receipt on device

```
SW 'push' → if !event.data or !notification_id: return
          → getNotifications({tag: notification_id})  (close stale, dedupe)
          → showNotification(title, {body, tag, actions:[taken,snooze,skip]})
SW 'notificationclick' → event.notification.close()
        → action='taken'  → postMessage {type:'TAKEN',   tomaId, takenAt}
        → action='snooze' → postMessage {type:'SNOOZE',  tomaId, snoozeMinutes:10}
        → action='skip'   → postMessage {type:'SKIP',    tomaId, reason:'notification-skip'}
        → no action       → clients.matchAll → focus /open /today
main-thread handler (existing) → useMarkTomaTaken / snooze API / useMarkTomaSkipped
```

### (d) Subscription pruning

```
notify-fallback send → push service returns 410|404
                    → supabase.from('push_subscriptions')
                        .update({is_active:false}).eq('id', subId)
                    → continue with next subscription (do NOT throw)
```

## SQL Migrations

| # | File | Purpose | Key shape |
|---|------|---------|-----------|
| 0011 | `push_subscriptions.sql` | New table; RLS: user reads/updates own rows; cuid_principal can read family rows for diagnostics | `id uuid pk`, `user_id uuid not null references auth.users`, `endpoint text unique`, `p256dh text`, `auth text`, `device_name text`, `is_active bool default true`, `created_at`, `last_seen_at` |
| 0012 | `notification_deliveries.sql` | Audit log per (toma, subscription, attempt) | `id uuid pk`, `toma_id uuid fk tomas`, `subscription_id uuid fk push_subscriptions`, `channel notification_channel`, `sent_at`, `status text check (status in ('success','failure'))`, `error_message text` |
| 0013 | `extend_notification_channel_enum.sql` | `ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'web_push'` — **single-statement migration**, see Risk #1 | n/a |
| 0014 | `push_due_view.sql` | Helper view `tomas_due_for_push` widening 0001's `tomas_due` with the 5-min window and joining paciente + medication | view only; select `(toma_id, paciente_id, scheduled_at, medication_name, dose_value, dose_unit, paciente_name)` |
| 0015 | `push_dispatch_cron.sql` | `get_active_push_subscribers(paciente_id)` SQL function (returns `setof push_subscriptions`); `materialize_due_pushes()` plpgsql function that selects due tomas and calls `net.http_post` to `notify-fallback`; `cron.schedule('notify-push-due-tomas','* * * * *', 'select public.materialize_due_pushes()')` | reuses `pg_net` from 0003 |

**Migration 0013 transaction note (Risk #1)**: `ALTER TYPE … ADD VALUE` cannot share a transaction with DDL that uses the new value (Postgres ≤15). Keep 0013 as a one-statement file; the new enum value is usable starting in migration 0014 because 0014's `notification_deliveries.channel` column is `text` (not the enum) — explicit cast to enum happens at INSERT time in the Edge Function. Verify the target Postgres version (`select version();`) before relying on 16+ behavior.

## Architecture Decisions

| Decision | Choice | Tradeoff | Rationale |
|----------|--------|----------|-----------|
| Edge Function reuse vs new | Extend `notify-fallback` | Function grows to ~390 lines; one codepath to test | Spec says "extend"; same `{tomaId,pacienteId}` body shape minimizes caller change |
| `web-push` library source | `npm:web-push@3.6.7` via `https://esm.sh/web-push@3.6.7?target=denonext` import-map entry in `notify-fallback/deno.json` | Adds a remote ESM dependency to Deno | Deno-first; no npm install in Edge runtime; version pin reproducible |
| Cron vs trigger | New 60s cron | 1440/day × 30 = ~43k invocations/mo (well under 500k free) | Existing INSERT trigger fires days early; web push needs time-accurate firing |
| Dedupe mechanism | `tag: notification_id` + `getNotifications({tag}).then(close)` in SW | Standard browser behavior; cross-device dedupe not solved (acceptable v1) | Spec says "same-device dedupe only" |
| VAPID key custody | Private key as Supabase secret; public key as `VITE_VAPID_PUBLIC_KEY` in `.env.local` and prod env | Two env surfaces to keep in sync; rotation = redeploy | Mirrors the existing `RESEND_API_KEY` pattern |
| `notification_deliveries.channel` type | `text` (not enum) | Loses DB-level constraint; Edge Function must cast | Avoids the 0013 transaction hazard; the column is an audit log, not an input to app logic |
| `device_name` source | `navigator.userAgent` parsed into a short label (`"Chrome on Android"`) at subscription time | Lossy labeling | No device-name API in browsers; UA parsing matches `getAvailableChannels()` precedent |
| Snooze endpoint reuse | New lightweight `POST /rest/v1/rpc/snooze_toma` RPC: `UPDATE tomas SET snoozed_until = now() + interval '10 minutes' WHERE id = $1 AND is_active_family_member(paciente_id)` | New RPC to register | Keeps SW free of direct table RLS decisions; reuses existing `is_active_family_member` helper |

## File Changes

| File | Action | Why |
|------|--------|-----|
| `supabase/migrations/0011_push_subscriptions.sql` | Create | New subscription store |
| `supabase/migrations/0012_notification_deliveries.sql` | Create | Delivery audit |
| `supabase/migrations/0013_extend_notification_channel_enum.sql` | Create | Enum value (single-statement) |
| `supabase/migrations/0014_push_due_view.sql` | Create | Reusable view for cron + dev |
| `supabase/migrations/0015_push_dispatch_cron.sql` | Create | `materialize_due_pushes` + cron.schedule |
| `supabase/functions/notify-fallback/deno.json` | Modify | Add `web-push` import-map entry |
| `supabase/functions/notify-fallback/index.ts` | Modify | Add `sendWebPush()` branch (~120 lines): read VAPID from env, iterate subscribers, call `webpush.sendNotification`, handle 410/404, log to `notification_deliveries` |
| `supabase/functions/notify-fallback/VAPID.md` | Create | Local `web-push generate-vapid-keys` procedure + `supabase secrets set` + `.env.local` recipe |
| `src/sw.ts` | Modify | Replace 17-line push stub (lines 186-203) with: data parse, `notification_id` required, dedupe via `getNotifications`, `showNotification` with the 3 actions, keep existing `notificationclick` action switch |
| `src/features/notifications/pushSubscription.ts` | Create | `subscribeToPush()` (calls `pushManager.subscribe`, POSTs row), `unsubscribeFromPush(id)`, `listMyPushSubscriptions()`, `parseDeviceName()` |
| `src/features/notifications/useVapidPublicKey.ts` | Create | `const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string \| undefined` + `useVapidPublicKey()` hook returning it (or `null`) |
| `src/features/notifications/DeviceList.tsx` | Create | Lists rows from `listMyPushSubscriptions()`; per-row Revoke button calling `unsubscribeFromPush(id)`; last-seen relative time |
| `src/features/notifications/scheduler.ts` | Modify | Add `isIOSStandalone(): boolean` (combines `isIOS()` + `!window.matchMedia('(display-mode: standalone)').matches`); export `requestPushSubscription()` helper that combines `requestNotificationPermission` + `pushManager.subscribe` + POST row |
| `src/features/notifications/NotificationPermissionPrompt.tsx` | Modify | `handleAllow` also calls `requestPushSubscription()` when VAPID is present; if subscribe returns 404/perms denied, the existing prompt UX still applies |
| `src/features/notifications/NotificationSettingsForm.tsx` | Modify | Add `web_push` to `channelDefs` (alwaysAvailable, no env gate); render `DeviceList` below the toggles when `web_push` enabled + `isIOS() && !isIOSStandalone()` shows the iOS "Add to Home Screen" yellow badge; extend `useUpdateNotificationSetting` channel union type to include `'web_push'`; update `api.ts` and `hooks.ts` channel union to `'in_app' \| 'email' \| 'sms' \| 'web_push'` |
| `src/features/notifications/api.ts` | Modify | Add `getPushSubscriptions`, `revokePushSubscription` wrappers; extend `updateNotificationSetting` channel union |
| `src/features/notifications/hooks.ts` | Modify | Add `usePushSubscriptions`, `useRevokePushSubscription`; extend `useUpdateNotificationSetting` channel union |
| `src/lib/database.types.ts` | Modify | Re-gen via `supabase gen types typescript` to include the new `push_subscriptions`, `notification_deliveries` tables; add `web_push` to `notification_channel` union |
| `.env.local.example` | Create (or modify) | Document `VITE_VAPID_PUBLIC_KEY` |
| `tests/e2e/push.spec.ts` | Create | Playwright flow (see Test Plan) |

## VAPID Key Management

Documented in `supabase/functions/notify-fallback/VAPID.md`. Steps:

1. **Generate locally** (one-time, dev box): `npx web-push generate-vapid-keys` → prints `publicKey` + `privateKey` (use the Node `web-push` CLI from devDependencies or a one-off `npx --package=web-push -- call`).
2. **Set Edge Function secrets**: `supabase secrets set VAPID_PUBLIC_KEY=<pub> VAPID_PRIVATE_KEY=<priv> VAPID_SUBJECT=mailto:admin@medicamentos.app` (subject is the `mailto:` or `https://` contact required by RFC 8030).
3. **Set client env** for the Vite build: append to `.env.local` (gitignored) and to the prod hosting provider: `VITE_VAPID_PUBLIC_KEY=<pub>`.
4. **Rotation (out of v1 scope)**: would require a `vapid_key_version` column on `push_subscriptions` and a 2-key transition window.

The same keypair MUST be used in dev, staging, and prod once committed; rotation is a breaking change for active subscriptions.

## Chained PR Slices (force-chained, 400-line budget)

| # | Scope | New+Modified lines (est.) | Review focus |
|---|-------|---------------------------|--------------|
| **PR 1** — schema foundation | Migrations `0011`, `0012`, `0013`, `0014` + `VAPID.md` + `.env.local.example` | ~210 | RLS contracts, enum constraint, view joins |
| **PR 2** — server delivery | Migration `0015` + `deno.json` + `index.ts` (`sendWebPush` branch + 410/404 handling + delivery logging) + integration test | ~280 | web-push config, 410/404 path, security-definer boundaries |
| **PR 3** — client subscribe + SW | `sw.ts` push rewrite + `pushSubscription.ts` + `useVapidPublicKey.ts` + `scheduler.ts` `requestPushSubscription` + `NotificationPermissionPrompt.tsx` update + unit tests | ~260 | SW dedupe, payload validation, permission flow |
| **PR 4** — settings UI | `DeviceList.tsx` + `NotificationSettingsForm.tsx` iOS badge + channel toggle + `api.ts` + `hooks.ts` type unions + unit tests | ~220 | iOS detection, optimistic UI, type-safety across forms |
| **PR 5** — E2E | `tests/e2e/push.spec.ts` (subscribe → cron tick → SW `push` event → click action) | ~150 | Test isolation, real Web Push in headless Chromium, time-travel |

PR 2 is the riskiest at ~280 lines because the Edge Function addition is dense; if the diff crosses 350, split the `sendWebPush` helper into its own file imported by `index.ts` (the function is the only change in that PR — 150 lines instead of 280).

Strategy: **Feature Branch Chain** — main is integration-sensitive because PR 2's Edge Function and PR 3's SW both expect the same payload contract, so a tracker branch is required. PR 1 targets `feat/web-push`; PRs 2-5 target the previous PR's branch and are rebased before merge.

## Test Plan

| Layer | What | Approach |
|-------|------|----------|
| Unit | `parseDeviceName` branches (Chrome/Firefox/Safari/Android/iOS) | vitest table-driven; `pushSubscription.test.ts` |
| Unit | SW push payload validator (`notification_id` required) | vitest; extract `validatePushPayload()` from `sw.ts` for testability |
| Unit | SW dedupe logic | vitest with `self.registration` stubbed via `vi.stubGlobal` |
| Unit | `sendWebPush` payload construction + 410/404 → `is_active=false` | vitest; mock `fetch` to return 410, assert supabase update |
| Unit | VAPID key shape validation (65-byte uncompressed P-256 pubkey) | vitest; uses `crypto.subtle.importKey` to assert |
| Integration | cron tick → tomas_due → `notify-fallback` → `notification_deliveries` row | vitest with a Deno child process OR a test harness that calls `materialize_due_pushes` with a frozen `now()` and asserts the rows it would write |
| E2E | Playwright: grant permission in a test browser, register a fake push service via `--enable-features=Push`, advance system clock (`page.clock.fastForward`), assert `showNotification` was called with the 3 actions | `tests/e2e/push.spec.ts`; uses `playwright`'s `worker` API to listen to the SW `push` event |

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| `ALTER TYPE … ADD VALUE` inside a tx breaks (Risk #1) | 0013 is a one-statement file; `notification_deliveries.channel` is `text`; Edge Function casts at INSERT |
| Cross-device dedupe (client + server both fire) | Acceptable v1 per proposal; same-device dedupe via `tag: notification_id` |
| Edge Function 60s timeout with many subscribers | Family of 5 × 2 devices × 300ms = 3s; well under. Document fallback: chunked sends (v2) |
| Cron cost | 1440/day = 43,200/mo; under 500k free tier |
| Dead subscription growth | 410/404 path in PR 2; periodic cleanup SQL job deferred to v2 |
| VAPID key rotation | Out of v1 scope; document as a breaking change requiring new subscriptions |
| iOS Safari silent-fail | `isIOSStandalone()` check + yellow badge in `NotificationSettingsForm`; `requestPushSubscription` returns `{ok:false, reason:'ios-not-standalone'}` and the UI reflects it |
| Push service rate limits | 1 cron tick resolves all due tomas in one Edge Function call; per-subscriber sends are sequential but bounded |

## Deviations from the Proposal (with rationale)

1. **`notification_deliveries.channel` is `text`, not the `notification_channel` enum.** The enum extension (0013) is single-statement; using the enum value inside a same-tx DDL would break on Postgres ≤15. The Edge Function casts at write time, preserving spec semantics.
2. **Snooze via new RPC, not direct table PATCH from SW.** SW runs without a user JWT in some clients (closed-app click); an RPC with `auth.uid()` inside the function is the RLS-safe path. Reuses `is_active_family_member` from 0001.
3. **Cron is `* * * * *` (every minute), window 5 minutes, not "every 1 minute / next minute" as the proposal summary suggests.** The 5-minute back-window absorbs cron-jitter and a missed tick without losing reminders. Spec mandated this window; proposal's summary was loose.
4. **`web-push` from `esm.sh`, not vendored.** Deno has no `node_modules` install path inside the Edge runtime; esm.sh is the project's existing pattern (supabase-js is loaded the same way).
5. **`device_name` parsed from UA at subscribe-time, not stored separately from the browser.** The browser exposes no friendly device name; UA parsing keeps the column a `text` instead of a structured object.
