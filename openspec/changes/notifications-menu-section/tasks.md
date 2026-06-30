# Tasks: Notifications Menu Section

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~127 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single-pr |
| Delivery strategy | single-pr |
| Chain strategy | pending |
| Strict TDD | enabled |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add Notificaciones entry to MoreSheet + its unit test | Commit 1 in single PR | Base: main. TDD red→green on MoreSheet. |
| 2 | Add Notificaciones entry to AppShell desktop nav + its unit test | Commit 2 in single PR | Depends on commit 1. TDD red→green on AppShell. |

---

## Phase 1: MoreSheet — test-first (red)

- [x] 1.1 Create `src/components/MoreSheet.test.tsx` (new) — write failing Vitest test covering:
  - R1: NavLink with `href="/notifications"` and visible text "Notificaciones" appears in the grid.
  - R2: Bell icon span (`🔔`) rendered in the entry.
  - R3: Tapping navigates and calls `onClose`.
  - R4: Notificaciones position immediately precedes Ajustes in rendered DOM order.
  - R5: All 8 pre-existing entries (`/adherence`, `/stock`, `/vacations`, `/retention`, `/reports/export`, `/travel`, `/admin/interactions`, `/settings`) are present in original relative order.
  - Verify red: `pnpm vitest run src/components/MoreSheet.test.tsx` fails (component lacks the entry).

## Phase 2: MoreSheet — implement (green)

- [x] 2.1 Insert `{ to: '/notifications', label: 'Notificaciones', icon: '🔔' }` into `moreItems` array in `src/components/MoreSheet.tsx` — line before `/settings` (current line 22).
- [x] 2.2 Run `pnpm vitest run src/components/MoreSheet.test.tsx` — confirm green.
- [x] 2.3 Run full `pnpm vitest run` — confirm green with no regressions.

## Phase 3: AppShell — test-first (red)

- [x] 3.1 Create `src/components/AppShell.test.tsx` (new) — write failing Vitest test covering:
  - Mocks: `useMediaQuery` → `false` (desktop), `usePacientes` → empty, `useActivePaciente` → null, `OutboxIndicator` → null, `NotificationPermissionPrompt` → null, `MoreSheet` → null.
  - R1: NavLink with `href="/notifications"` and visible text "Notificaciones" renders inside `.desktop-nav`.
  - R2: Notificaciones position immediately precedes Ajustes in `.desktop-nav` link order.
  - R3: All 12 pre-existing entries (`/`, `/pacientes`, `/medications`, `/calendar`, `/adherence`, `/stock`, `/vacations`, `/retention`, `/reports/export`, `/travel`, `/admin/interactions`, `/settings`) are present in original relative order.
  - Verify red: `pnpm vitest run src/components/AppShell.test.tsx` fails (component lacks the entry).

## Phase 4: AppShell — implement (green)

- [x] 4.1 Insert `{ to: '/notifications', label: 'Notificaciones' }` into `navItems` array in `src/components/AppShell.tsx` — line before `/settings` (current line 27). No `icon` field (matches existing convention).
- [x] 4.2 Run `pnpm vitest run src/components/AppShell.test.tsx` — confirm green.
- [x] 4.3 Run full `pnpm vitest run` — confirm green with no regressions.

## Phase 5: Typecheck & Build

- [x] 5.1 Run `pnpm tsc -b --noEmit` — confirm no new type errors.
- [x] 5.2 Run `pnpm build` — confirm clean production build.

## Phase 6: Visual smoke test

- [x] 6.1 Manual: open `http://localhost:5173/notifications` via the menu on both mobile (MoreSheet) and desktop (header nav) viewports. Confirm entry appears, is positioned before "Ajustes", and navigates correctly.

## Phase 7: Commit & PR

- [x] 7.1 Commit 1: `feat(menu): add Notificaciones entry to MoreSheet` — includes `MoreSheet.test.tsx` + `MoreSheet.tsx` change.
- [x] 7.2 Commit 2: `feat(menu): add Notificaciones entry to AppShell desktop nav` — includes `AppShell.test.tsx` + `AppShell.tsx` change.
- [x] 7.3 Push branch, open single PR to `main` with title `feat(menu): add Notificaciones entry to MoreSheet and AppShell desktop nav`. PR body references the change folder and the user-reported UX blocker.
