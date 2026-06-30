# Proposal: snooze-push-alerts — fix silent push + snooze re-trigger

## Problem
User reports Android Chrome push arrives silent; snooze re-trigger broken; deep link /today doesn't exist; iOS has no snooze path.

## Chosen Approach
**Approach D (hybrid)** — split into 3 chained PRs:
1. **PR1**: Extend `tomas_due_for_push` view for snooze re-trigger (SQL guarded OR)
2. **PR2**: Fix SW snooze handler + add `/today` route with toma highlight
3. **PR3**: Add in-app intake modal for iOS fallback + auto-trigger hook for deep-link actions

## Key Decisions
- 3-button layout (taken/snooze/skip) preserved — out of scope to change
- Silent push may be Android OS-level notification settings, not code
- Stacked-to-main chain strategy (4 PRs against main independently)

## Rollback Plan
- PR1: `CREATE OR REPLACE VIEW` — atomically revertible via single-statement rollback
- PR2 and PR3: git revert

## Open UX Question (PRESERVED)
- 3-button vs 2-button action layout: the change preserves 3 buttons per the proposal's "Out of Scope" rule. The user can override at any time.
