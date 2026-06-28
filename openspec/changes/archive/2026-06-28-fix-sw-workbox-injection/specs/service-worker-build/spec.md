# Delta Spec: service-worker-build

**Change**: fix-sw-workbox-injection
**Capability**: `service-worker-build` (new)
**Status**: Proposed

## Purpose

Defines the build contract for the production Service Worker (`src/sw.ts` → `dist/sw.js`). The SW MUST bundle Workbox as ES modules so the script evaluates, the SW registers, and the Web Push handshake can complete. Runtime SW behavior is unchanged and remains governed by `openspec/specs/reminder/spec.md`.

---

## ADDED Requirements

### Requirement: Built SW does not reference `workbox` as an undefined global

The SW produced by `vite build` with `vite-plugin-pwa` SHALL evaluate without `ReferenceError: workbox is not defined`. The Workbox runtime SHALL be imported via ES modules or inlined into the bundle.

#### Scenario: Built sw.js has no top-level `workbox` global reference

- GIVEN the production build has run
- WHEN `dist/sw.js` is searched for the bare identifier `workbox`
- THEN every occurrence SHALL be (a) an import source string, (b) a top-level `import` binding, or (c) a member access on an imported binding
- AND there SHALL be NO expression of the form `workbox.<member>` outside an import scope

#### Scenario: `pnpm build` exits successfully

- GIVEN a clean working tree
- WHEN `pnpm build` is executed
- THEN the build SHALL exit with code 0
- AND `dist/sw.js` SHALL be produced
- AND `dist/sw.js` SHALL NOT contain `// @ts-ignore` adjacent to a workbox import

### Requirement: Service Worker registers and activates in a real browser

The deployed SW SHALL register, install, and activate in Chrome and Firefox. `navigator.serviceWorker.ready` SHALL resolve, not hang.

#### Scenario: SW activates in production Chrome

- GIVEN a user visits https://medicamentos-neon.vercel.app/ in Chrome and waits up to 5 seconds
- WHEN DevTools → Application → Service Workers is inspected
- THEN the SW SHALL show status `#activated and is running`
- AND no `ReferenceError` SHALL appear in the console

#### Scenario: Web Push handshake completes (no `ready` hang)

- GIVEN a user toggles the `web_push` channel ON
- WHEN the code awaits `navigator.serviceWorker.ready`
- THEN the promise SHALL resolve within 5 seconds
- AND `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: ... })` SHALL either show the permission prompt, resolve with a `PushSubscription`, or reject with a known `DOMException`

### Requirement: Workbox runtime behavior is preserved after the bundling fix

The fix SHALL NOT change SW runtime behavior. Precache, route caching, push handler, and notification actions SHALL remain functionally equivalent to pre-fix.

#### Scenario: Precache and route registration are present in the built SW

- GIVEN `pnpm build` has run
- WHEN `dist/sw.js` is inspected
- THEN a `precacheAndRoute(...)` call SHALL be present
- AND at least one `registerRoute(...)` call SHALL be present
- AND the Supabase REST regex `/^https:\/\/cmoydmfdhssxdmwqlueg\.supabase\.co\/rest\/v1\/.*/i` SHALL match the pre-fix version

#### Scenario: Supabase REST caching config is unchanged

- WHEN the SW intercepts `https://cmoydmfdhssxdmwqlueg.supabase.co/rest/v1/...`
- THEN the SW SHALL apply `NetworkFirst` with cache name `supabase-api`
- AND `ExpirationPlugin` SHALL use `maxEntries: 200`, `maxAgeSeconds: 86400`, `networkTimeoutSeconds: 5`

#### Scenario: Push event handler is intact

- WHEN the Edge Function sends a Web Push with a valid payload
- THEN the SW SHALL parse `event.data.json()`, dedupe by `notification_id`, and call `showNotification(...)` with three action buttons (`taken`, `snooze`, `skip`)
- AND the `notificationclick` handler SHALL route `taken`/`snooze`/`skip`/body-tap to `/today` exactly as before

### Requirement: Workbox runtime modules are declared as direct dependencies

The four Workbox modules imported by `src/sw.ts` SHALL be declared in `package.json` at the same major.minor as `workbox-window`.

#### Scenario: All four modules are listed at `^7.4.1`

- WHEN `package.json` is inspected
- THEN the deps SHALL include `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration`
- AND all four SHALL be at version `^7.4.x` (matching `workbox-window: ^7.4.1`)

---

## MODIFIED Requirements

None.

## REMOVED Requirements

None.

## Cross-references

- **Proposal**: `openspec/changes/fix-sw-workbox-injection/proposal.md`
- **Affected files**: `src/sw.ts:5-13` (ES imports), `package.json` (4 new deps), `vite.config.ts:54-70` (remove dead `workbox` block), `pnpm-lock.yaml` (auto-regen)
- **Related source-of-truth**: `openspec/specs/reminder/spec.md` — runtime behavior unchanged
- **Verification**: `pnpm build` + manual browser smoke (no new tests; SW registration is non-deterministic in Playwright)
