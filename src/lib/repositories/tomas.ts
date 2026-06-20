// Tomas repository — state machine, tolerance, idempotency, cross-day backfill.

type TomaStatus = 'pending' | 'taken_on_time' | 'taken_late' | 'skipped' | 'missed';

const TOLERANCE_MINUTES = 15;
const BACKFILL_DAYS = 7;

export interface TomaStateInput {
  currentState: TomaStatus;
  scheduledAt: Date;
  now: Date;
  takenAt?: Date | null;
  skipReason?: string | null;
}

export interface TomaStateResult {
  status: TomaStatus;
  takenAt: string | null;
  skipReason: string | null;
}

/**
 * Compute the next toma status based on the current state and action.
 * Pure function — no side effects, no DB calls.
 */
export function computeNextState(input: TomaStateInput): TomaStateResult {
  const { currentState, scheduledAt, now, takenAt, skipReason } = input;

  if (currentState === 'taken_on_time' || currentState === 'taken_late') {
    // Idempotent: already taken, return as-is
    return {
      status: currentState,
      takenAt: now.toISOString(),
      skipReason: null,
    };
  }

  if (currentState === 'skipped' || currentState === 'missed') {
    // Idempotent: already resolved
    return {
      status: currentState,
      takenAt: null,
      skipReason: skipReason ?? null,
    };
  }

  // currentState === 'pending'
  if (takenAt) {
    const diffMs = Math.abs(takenAt.getTime() - scheduledAt.getTime());
    const diffMin = diffMs / (1000 * 60);

    if (diffMin <= TOLERANCE_MINUTES) {
      return { status: 'taken_on_time', takenAt: takenAt.toISOString(), skipReason: null };
    }

    // Check backfill window: within 7 days = taken_late, beyond = rejected
    const backfillMs = BACKFILL_DAYS * 24 * 60 * 60 * 1000;
    const sinceScheduled = now.getTime() - scheduledAt.getTime();

    if (sinceScheduled > backfillMs) {
      // Beyond 7-day backfill window — reject
      return { status: 'pending', takenAt: null, skipReason: null };
    }

    return { status: 'taken_late', takenAt: takenAt.toISOString(), skipReason: null };
  }

  if (skipReason) {
    return { status: 'skipped', takenAt: null, skipReason };
  }

  // Check if missed (past tolerance window)
  const toleranceEnd = new Date(scheduledAt.getTime() + TOLERANCE_MINUTES * 60 * 1000);
  if (now > toleranceEnd) {
    return { status: 'missed', takenAt: null, skipReason: null };
  }

  return { status: 'pending', takenAt: null, skipReason: null };
}

/**
 * Check if a toma can still be edited (backfill within 7-day window).
 */
export function canEditBackfill(scheduledAt: Date, now: Date = new Date()): boolean {
  const backfillMs = BACKFILL_DAYS * 24 * 60 * 60 * 1000;
  const diffMs = now.getTime() - scheduledAt.getTime();
  return diffMs <= backfillMs;
}

/**
 * Check if a toma is within the tolerance window (can still be taken on time).
 */
export function isWithinTolerance(scheduledAt: Date, now: Date = new Date()): boolean {
  const toleranceEnd = new Date(scheduledAt.getTime() + TOLERANCE_MINUTES * 60 * 1000);
  return now <= toleranceEnd;
}
