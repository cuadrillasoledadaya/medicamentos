# Tasks: Web Push Notifications

## Stack & Conventions

| Dimension | Value |
|-----------|-------|
| Test runner | Vitest 4.x (`pnpm vitest run`) |
| E2E | Playwright 1.61.x (`pnpm test:e2e`) |
| Strict TDD | **Active** — RED→GREEN→REFACTOR required per task |
| Typecheck | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| File layout | `src/features/<feature>/<sub>.ts` (logic), `.tsx` (components) |
| Migration naming | `supabase/migrations/XXXX_short_snake.sql` |
| Commit style | Conventional commits, no Co-Authored-By |
| Branch style | `feat/medication-push-pr<N>` (stacked-to-main) |
| Channel union | `'in_app' | 'email' | 'sms' | 'web_push'` |

> **Chain strategy note**: Design document proposed "Feature Branch Chain" for payload contract safety between PR 2 and PR 3. The cached session setting (overriding) is **stacked-to-main** — each PR merges to main in order. PR 1 → main, PR 2 → main, etc. PR 2 will handle any contract-coordination via versioned payload shapes.

## Out of Scope (v2)

- Quiet hours / "do not disturb" scheduling
- Cross-device snooze — snoozing on one device does not cancel on another
- iOS "Add to Home Screen" install prompt UX (deferred; yellow badge is the v1 mitigation)
- Email/SMS fallback improvements — existing `notify-fallback` stubs unchanged
- Cross-device notification deduplication
- Periodic cleanup cron for dead subscriptions
- VAPID key rotation procedure

## Acceptance per PR

| PR | Merge gate |
|----|------------|
| **PR 1** | All migrations apply cleanly on a fresh DB; existing RLS policies unchanged; `pnpm tsc --noEmit` clean; vitest unit tests pass |
| **PR 2** | Migration 0015 applies; Edge Function responds to POST with valid web-push payload; 410/404 path marks subscription inactive; `pnpm vitest run` for server unit tests passes |
| **PR 3** | SW `push` handler parses payload, dedupes, shows 3 action buttons; `pushManager.subscribe` flow works with VAPID key; permission denied reverts toggle; `pnpm vitest run` passes |
| **PR 4** | DeviceList renders subscriptions with Revoke; iOS yellow badge shows on Safari standalone=false; web_push toggle creates subscription row; `pnpm vitest run` passes |
| **PR 5** | Playwright runs `push.spec.ts` in headless Chromium with fake push service; all action buttons tested; `pnpm test:e2e` passes |

---

## PR 1: Schema Foundation (~250 lines)

- [x] 1.1 Create `supabase/migrations/0011_push_subscriptions.sql` — push_subscriptions table with RLS
- [x] 1.2 Create `supabase/migrations/0012_notification_deliveries.sql` — delivery audit log with RLS
- [x] 1.3 Create `supabase/migrations/0013_extend_notification_channel_enum.sql` — single-statement enum extension
- [x] 1.4 Create `supabase/migrations/0014_push_due_view.sql` — tomas_due_for_push view with 5-min window
- [x] 1.5 Create `supabase/functions/notify-fallback/VAPID.md` — VAPID key generation + secret management doc
- [x] 1.6 Modify `.env.example` — add VITE_VAPID_PUBLIC_KEY placeholder
- [x] 1.7 Modify `src/lib/database.types.ts` — add push_subscriptions, notification_deliveries types; extend notification_channel enum
- [x] 1.8 Verify migrations + types — pnpm tsc --noEmit clean; vitest unit tests pass; lint 0 errors

### 1.1 Create `supabase/migrations/0011_push_subscriptions.sql`

- **What**: New table with RLS (user reads/updates own rows; cuidador_principal reads family rows)
- **Columns**: id(uuid PK), user_id(fk auth.users), endpoint(text unique), p256dh, auth, device_name, is_active(default true), created_at, last_seen_at

### 1.2 Create `supabase/migrations/0012_notification_deliveries.sql`

- **What**: Delivery audit log; id(uuid PK), toma_id(fk tomas), subscription_id(fk push_subscriptions), channel(text), sent_at, status(check success/failure), error_message(nullable)

### 1.3 Create `supabase/migrations/0013_extend_notification_channel_enum.sql`

- **What**: Single-statement migration: `ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'web_push'` (standalone — cannot share tx with DDL using the new value)

### 1.4 Create `supabase/migrations/0014_push_due_view.sql`

- **What**: View `tomas_due_for_push` with 5-min delivery window, joining tomas + medications + pacientes

### 1.5 Create `supabase/functions/notify-fallback/VAPID.md`

- **What**: Document local key generation (`npx web-push generate-vapid-keys`), `supabase secrets set`, `.env.local` recipe

### 1.6 Modify `.env.local.example`

- **What**: Add `VITE_VAPID_PUBLIC_KEY=<your-public-key-here>` with comment explaining where to get it

### 1.7 Modify `src/lib/database.types.ts`

- **What**: Add `push_subscriptions`, `notification_deliveries` table types; extend `notification_channel` enum union to include `'web_push'`

### 1.8 Verify migrations + types

- **What**: Run all 4 migrations on a fresh DB; run `pnpm tsc --noEmit`; verify existing RLS policies unchanged; verify no migration tx for 0013 conflicts

---

## PR 2: Server Delivery (~280 lines)

- [x] 2.1 Create `supabase/migrations/0015_push_dispatch_cron.sql`

### 2.1 Create `supabase/migrations/0015_push_dispatch_cron.sql`

- **What**: `get_active_push_subscribers(paciente_id)` function returning `setof push_subscriptions`; `materialize_due_pushes()` plpgsql calling `net.http_post` to `notify-fallback`; `cron.schedule('notify-push-due-tomas','* * * * *')`; also create `snooze_toma` RPC: `UPDATE tomas SET snoozed_until = now() + interval '10 minutes'`

- [x] 2.2 Modify `supabase/functions/notify-fallback/deno.json`

### 2.2 Modify `supabase/functions/notify-fallback/deno.json`

- **What**: Add import-map entry: `"web-push": "https://esm.sh/web-push@3.6.7?target=denonext"`

- [x] 2.3 Modify `supabase/functions/notify-fallback/index.ts` (sendWebPush branch)

### 2.3 Modify `supabase/functions/notify-fallback/index.ts` (sendWebPush branch)

- **What**: Read VAPID env vars; iterate subscribers; call `webpush.sendNotification`; handle 200→delivery log, 410/404→mark inactive; continue on per-sub error (don't throw)

- [x] 2.4 Write unit test: `sendWebPush` payload + 410/404 handling

### 2.4 Write unit test: `sendWebPush` payload + 410/404 handling

- **What**: `vitest`; mock `fetch` to return 200/410/404; assert `notification_deliveries` INSERT and `is_active=false` update

- [x] 2.5 Write unit test: VAPID key shape validation

### 2.5 Write unit test: VAPID key shape validation

- **What**: `vitest`; assert 65-byte uncompressed P-256 pubkey using `crypto.subtle.importKey`; reject invalid lengths/encodings

---

## PR 3: Client Subscribe + SW (~260 lines)

### 3.1 Create `src/features/notifications/pushSubscription.ts`

- **What**: `subscribeToPush()` (pushManager.subscribe + POST row), `unsubscribeFromPush(id)`, `listMyPushSubscriptions()`, `parseDeviceName()` UA parser

### 3.2 Create `src/features/notifications/useVapidPublicKey.ts`

- **What**: Read `import.meta.env.VITE_VAPID_PUBLIC_KEY` as `string | undefined`; export `useVapidPublicKey()` hook

### 3.3 Modify `src/features/notifications/scheduler.ts`

- **What**: Add `isIOSStandalone()` (isIOS + display-mode check); export `requestPushSubscription()` combining permission request + pushManager.subscribe + POST row

### 3.4 Modify `src/sw.ts` — rewrite push event handler (lines 186–203)

- **What**: Parse payload; validate `notification_id` required; dedupe via `getNotifications({tag}).then(close)`; `showNotification` with medication_name, dose, 3 actions (taken/snooze/skip); keep existing `notificationclick` action → postMessage

### 3.5 Modify `src/features/notifications/NotificationPermissionPrompt.tsx`

- **What**: `handleAllow` calls `requestPushSubscription()` when VAPID present; on failure, existing prompt UX still applies

### 3.6 Write unit test: `parseDeviceName` (table-driven)

- **What**: `vitest`; test Chrome/Firefox/Safari/Android/iOS UA strings; assert correct short labels

### 3.7 Write unit test: `validatePushPayload`

- **What**: `vitest`; extract from SW for testability; assert valid payload passes, missing notification_id returns false

### 3.8 Write unit test: SW dedupe logic

- **What**: `vitest` with `self.registration` stubbed via `vi.stubGlobal`; assert duplicate tag closes existing notification

---

## PR 4: Settings UI (~220 lines)

### 4.1 Create `src/features/notifications/DeviceList.tsx`

- **What**: List from `listMyPushSubscriptions()`; per-row Revoke button calling `unsubscribeFromPush(id)`; last-seen relative time; empty state when no subscriptions

### 4.2 Modify `src/features/notifications/api.ts`

- **What**: Add `getPushSubscriptions()`, `revokePushSubscription(id)`; extend channel union to `'in_app' | 'email' | 'sms' | 'web_push'` in `updateNotificationSetting`

### 4.3 Modify `src/features/notifications/hooks.ts`

- **What**: Add `usePushSubscriptions(pacienteId)`, `useRevokePushSubscription()`; extend `useUpdateNotificationSetting` channel union

### 4.4 Modify `src/features/notifications/NotificationSettingsForm.tsx`

- **What**: Add `web_push` to `channelDefs` (alwaysAvailable); render `DeviceList` when `web_push` enabled; if `isIOS() && !isIOSStandalone()` show yellow badge

### 4.5 Write unit test: DeviceList rendering

- **What**: `vitest` + `@testing-library/react`; render with mock subscriptions; assert Revoke button + device name visible; test empty state

---

## PR 5: E2E Verification (~150 lines)

### 5.1 Create `tests/e2e/push.spec.ts`

- **What**: Playwright: grant notification permission; register fake push service via Chromium flags (`--enable-features=Push`); use `page.clock.fastForward` to simulate cron tick; SW `push` event listener asserts `showNotification` called with 3 action buttons; click each action and verify navigation/API call

---

## Review Workload Forecast

| PR | Est. changed lines | Review focus |
|----|-------------------|--------------|
| **PR 1** — schema foundation | ~250 | RLS contracts, migration isolation, enum constraint |
| **PR 2** — server delivery | ~280 | `sendWebPush` branch, 410/404 path, cron scheduling |
| **PR 3** — client subscribe + SW | ~260 | SW payload validation, dedupe, permission flow |
| **PR 4** — settings UI | ~220 | iOS detection, DeviceList optimistic UI, type unions |
| **PR 5** — E2E | ~150 | Test isolation, real Web Push in headless Chromium |
| **Total** | ~1,160 | All under 400-line budget per PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low
