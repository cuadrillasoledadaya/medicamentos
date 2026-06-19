// Tomas outbox wrapper — queues writes when offline, replays on reconnect.

import { enqueueOutbox, dequeueOutbox, pendingOutboxCount } from '../../lib/idb';
import { upsertToma } from './api';
import type { Toma } from '../../lib/database.types';

interface TomaOutboxEntry {
  schedule_id: string;
  paciente_id: string;
  scheduled_at: string;
  status?: string;
  taken_at?: string | null;
  skip_reason?: string | null;
  notes?: string | null;
}

let replayInProgress = false;

/**
 * Attempt to save a toma. If offline or network fails, enqueue to IndexedDB outbox.
 */
export async function saveTomaWithOutbox(
  data: TomaOutboxEntry,
): Promise<{ data: Toma | null; error: Error | null }> {
  if (navigator.onLine) {
    const result = await upsertToma(data);
    if (!result.error) {
      return result;
    }
    // Network error — fall through to outbox
  }

  // Enqueue to outbox
  await enqueueOutbox('insert', 'tomas', data as unknown as Record<string, unknown>);
  return { data: null, error: null }; // Optimistic success
}

/**
 * Replay all pending outbox entries for tomas.
 */
export async function replayTomasOutbox(): Promise<void> {
  if (replayInProgress) return;
  replayInProgress = true;

  try {
    while (true) {
      const entry = await dequeueOutbox();
      if (!entry || entry.table !== 'tomas') break;

      const result = await upsertToma(entry.payload as unknown as TomaOutboxEntry);
      if (result.error) {
        // Re-enqueue on failure (in a real app, you'd track attempts)
        await enqueueOutbox(entry.op, entry.table, entry.payload);
        break;
      }
    }
  } finally {
    replayInProgress = false;
  }
}

/**
 * Get the number of pending outbox entries.
 */
export async function getPendingOutboxCount(): Promise<number> {
  return pendingOutboxCount();
}

/**
 * Set up online/offline event listeners for automatic replay.
 */
export function setupOutboxReplay(): void {
  window.addEventListener('online', () => {
    replayTomasOutbox();
  });
}
