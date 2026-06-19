// Pure functions for toma status computation.

type IntakeStatus = 'pending' | 'taken_on_time' | 'taken_late' | 'skipped' | 'missed';

/**
 * Compute the status of a toma based on when it was taken vs when it was scheduled.
 * 15-minute tolerance window per spec.
 */
export function computeStatus(
  scheduledAt: Date,
  takenAt: Date | null,
  now: Date = new Date(),
): IntakeStatus {
  if (!takenAt) {
    // Check if it's past the tolerance window
    const toleranceEnd = new Date(scheduledAt.getTime() + 15 * 60 * 1000);
    if (now > toleranceEnd) {
      return 'missed';
    }
    return 'pending';
  }

  const diffMs = Math.abs(takenAt.getTime() - scheduledAt.getTime());
  const diffMin = diffMs / (1000 * 60);

  if (diffMin <= 15) {
    return 'taken_on_time';
  }

  // Different calendar day or same day but late
  return 'taken_late';
}

/**
 * Check if a toma can still be edited (backfill within 7-day window).
 * Per design-answers Q2=A.
 */
export function canEdit(
  scheduledAt: Date,
  now: Date = new Date(),
): boolean {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const diffMs = now.getTime() - scheduledAt.getTime();
  // Can edit if within 7 days after scheduled
  return diffMs <= sevenDaysMs;
}

/**
 * Format a weekday mask into human-readable labels.
 */
export function formatWeekdays(mask: number): string {
  const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    if ((mask & (1 << i)) !== 0) {
      days.push(labels[i]);
    }
  }
  return days.join(', ');
}

/**
 * Get the status label in Spanish.
 */
export function statusLabel(status: IntakeStatus): string {
  const labels: Record<IntakeStatus, string> = {
    pending: 'Pendiente',
    taken_on_time: 'Tomada a tiempo',
    taken_late: 'Tomada tarde',
    skipped: 'Saltada',
    missed: 'Perdida',
  };
  return labels[status];
}

/**
 * Get the status color.
 */
export function statusColor(status: IntakeStatus): string {
  const colors: Record<IntakeStatus, string> = {
    pending: '#f59e0b',
    taken_on_time: '#16a34a',
    taken_late: '#ea580c',
    skipped: '#6b7280',
    missed: '#dc2626',
  };
  return colors[status];
}
