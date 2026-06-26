# Apply Progress: web-push-notifications

## PR 1: Schema Foundation

**Status**: ✅ Complete (8/8 tasks)
**Branch**: `feat/medication-push-pr1`
**Mode**: Strict TDD (RED→GREEN→REFACTOR)

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/unit/migrations/push-schema.test.ts` | Unit (SQL parse) | N/A (new) | ✅ Written | ✅ Passed | ✅ 15 assertions | ✅ RLS policy fixed |
| 1.2 | `tests/unit/migrations/push-schema.test.ts` | Unit (SQL parse) | N/A (new) | ✅ Written | ✅ Passed | ✅ 11 assertions | ➖ None needed |
| 1.3 | `tests/unit/migrations/push-schema.test.ts` | Unit (SQL parse) | N/A (new) | ✅ Written | ✅ Passed | ✅ 3 assertions | ➖ Single statement |
| 1.4 | `tests/unit/migrations/push-schema.test.ts` | Unit (SQL parse) | N/A (new) | ✅ Written | ✅ Passed | ✅ 8 assertions | ➖ None needed |
| 1.5 | N/A (docs) | Docs | N/A | ➖ Docs only | ➖ Docs only | ➖ N/A | ➖ N/A |
| 1.6 | N/A (config) | Config | N/A | ➖ Config only | ➖ Config only | ➖ N/A | ➖ N/A |
| 1.7 | N/A (types) | Types | N/A | ➖ Type-only | ➖ Type-only | ➖ N/A | ➖ None needed |
| 1.8 | `tests/unit/types/push.test.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 9 assertions | ✅ Cleaned unused imports |

### Test Summary
- **Total tests written**: 46 (37 migration + 9 type validation)
- **Total tests passing**: 46/46
- **Layers used**: Unit (SQL parse validation, Zod runtime validation)
- **Pure functions created**: 1 (`validatePushPayload`)

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `supabase/migrations/0011_push_subscriptions.sql` | Created | push_subscriptions table with RLS (owner read/write/insert, family read via family_members join) |
| `supabase/migrations/0012_notification_deliveries.sql` | Created | notification_deliveries audit table with RLS (family read, insert via family membership) |
| `supabase/migrations/0013_extend_notification_channel_enum.sql` | Created | Single-statement ALTER TYPE for 'web_push' enum value |
| `supabase/migrations/0014_push_due_view.sql` | Created | tomas_due_for_push view with 5-min delivery window |
| `supabase/functions/notify-fallback/VAPID.md` | Created | VAPID key generation, storage, and rotation documentation |
| `.env.example` | Modified | Added VITE_VAPID_PUBLIC_KEY placeholder with reference to VAPID.md |
| `src/lib/database.types.ts` | Modified | Added push_subscriptions, notification_deliveries table types; extended notification_channel enum; added tomas_due_for_push view type |
| `src/types/push.ts` | Created | Zod schemas for PushSubscriptionRecord, NotificationDeliveryRecord, PushPayload + validatePushPayload helper |
| `tests/unit/migrations/push-schema.test.ts` | Created | 37 tests validating migration SQL structure, columns, constraints, RLS policies |
| `tests/unit/types/push.test.ts` | Created | 9 tests for Zod schema validation (happy path + edge cases) |
| `eslint.config.js` | Modified | Added test file patterns to allowDefaultProject |
| `openspec/changes/web-push-notifications/tasks.md` | Modified | Added completion checkboxes for PR 1 tasks |

### Deviations from Design
None — implementation matches design.

### Issues Found
- **No SQL test harness**: The project does not have pg-mem or testcontainers. Migration tests parse SQL files and assert expected DDL patterns. User must apply migrations to their Supabase instance before verifying schema at runtime.
- **RLS policy for push_subscriptions family read**: The `is_active_family_member()` function takes a `paciente_id`, but push_subscriptions is keyed by `user_id`. Resolved by using a subquery through `family_members` table to check if the current user is a cuidador_principal of any paciente where the subscription's user is also an active family member.

### Verification Results
- ✅ `pnpm typecheck` — passes (0 errors)
- ✅ `pnpm vitest run` — 107 tests passing (37 migration + 9 push types + 61 pre-existing)
- ✅ `pnpm lint` — 0 errors (63 warnings, all pre-existing)

### Remaining PR 1 Tasks
None — all 8 tasks complete.

### PR 2 Setup Notes
- PR 2 should base on `main` (stacked-to-main strategy)
- New env vars needed for PR 2: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (Supabase secrets)
- The `notification_deliveries.channel` column is `text` (not enum) — Edge Function must cast at INSERT time
- The `push_subscriptions` table is ready for INSERT operations from the client subscription flow
- Zod schemas in `src/types/push.ts` are ready for use in PR 3 (client-side payload validation)
