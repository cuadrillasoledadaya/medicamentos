# Proposal: Fix SW Workbox injection

## Intent

Production `dist/sw.js` references `workbox` as a global but no runtime is injected. The browser throws `ReferenceError: workbox is not defined` at `sw.js:1:25`, the Service Worker fails to register, and `navigator.serviceWorker.ready` hangs forever. This was invisible until `fix-web-push-subscribe` made the `notification_settings` mutation succeed — now the code reaches `await navigator.serviceWorker.ready` and blocks.

## Scope

### In Scope
- Convert `src/sw.ts:5-13` from `workbox.*` globals to ES module imports
- Add `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration` as direct deps in `package.json`
- Remove the dead `workbox: { runtimeCaching }` block from `vite.config.ts:54-70` (duplicate of routes already in `src/sw.ts:20-40`)
- Verify `pnpm build` succeeds and `dist/sw.js` has no `workbox` global references

### Out of Scope
- Changes to notification UX, subscription flow, or error handling
- VAPID key validation or rotation
- Modifying runtime caching behavior (same rules, different import mechanism)
- E2E test additions (manual smoke test only — SW registration is hard to assert deterministically in Playwright)

## Capabilities

### New Capabilities
None

### Modified Capabilities
None

## Approach

1. **ES imports** — replace `workbox.*` globals + `@ts-ignore` in `src/sw.ts:5-13` with direct ES module imports. No CDN dependency, tree-shaken.
2. **Add deps** — `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration` at `^7.4.1`.
3. **Remove dead config** — delete `vite.config.ts:54-70` (`workbox: { runtimeCaching }` is `generateSW` config, ignored in `injectManifest` mode; routes already in `src/sw.ts:20-40`).
4. **Build and verify** — `pnpm build` succeeds, `dist/sw.js` has no `workbox` global references, precache + routes functionally equivalent.

**PR shape**: Single PR, ~25 changed lines. No chaining.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/sw.ts:5-13` | Modified | Replace `workbox.*` globals + `@ts-ignore` with ES module imports |
| `package.json` | Modified | Add 4 workbox runtime deps at `^7.4.1` |
| `vite.config.ts:54-70` | Removed | Delete dead `workbox: { runtimeCaching }` block |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Build fails due to workbox package version mismatch | Low | Pin all workbox deps to same `^7.4.1` version |
| `injectManifest` bundling produces a larger SW than before | Low | ES imports are tree-shaken; only used symbols are included |
| Existing cached SW on user browsers still has the broken global | Medium | `registerType: 'autoUpdate'` + `skipWaiting` handles this on next load; user may need one hard refresh |

## Rollback Plan

Revert the single PR. Restores the broken `workbox` global references — same state as before. No schema or data changes.

## Dependencies

- None

## Test Plan

### Build verification
1. `pnpm build` succeeds, `dist/sw.js` has no `workbox.` global references
2. Precache manifest and route registration present in output

### Manual smoke test
3. Deploy to Vercel, hard-refresh in Chrome
4. DevTools → Application → Service Workers: "activated and is running"
5. Console shows no `ReferenceError`; `/notifications` toggle triggers browser permission prompt (previously hung)

## Acceptance Criteria

- [ ] `pnpm build` succeeds, no `workbox` global in `dist/sw.js`
- [ ] SW registers successfully in production
- [ ] `navigator.serviceWorker.ready` resolves (no hang)
- [ ] Push subscription prompt appears when toggling web_push ON
- [ ] Runtime caching behavior unchanged (NetworkFirst for API, StaleWhileRevalidate for assets)

## Non-goals

- Does NOT change notification UX, error messages, VAPID keys, or caching behavior
- Does NOT add E2E tests for SW registration
