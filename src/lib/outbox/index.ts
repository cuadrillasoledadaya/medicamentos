// Outbox module — queues writes when offline, replays on reconnect.
// Wraps the low-level IndexedDB helpers from idb.ts with a cleaner API.

import { enqueueOutbox, dequeueOutbox, pendingOutboxCount } from '../idb';

export interface OutboxEntry {
  op: 'insert' | 'update' | 'delete';
  table: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

type StatusCallback = (count: number) => void;

const statusListeners: StatusCallback[] = [];

/**
 * Enqueue an operation to the outbox.
 */
export async function enqueue(
  op: OutboxEntry['op'],
  table: string,
  payload: Record<string, unknown>,
): Promise<number> {
  const id = await enqueueOutbox(op, table, payload);
  notifyStatusChange();
  return id;
}

/**
 * Replay all pending outbox entries, calling the provided handler for each.
 * Returns the number of successfully replayed entries.
 */
export async function replay(
  handler: (entry: OutboxEntry) => Promise<boolean>,
): Promise<number> {
  let replayed = 0;

  while (true) {
    const entry = await dequeueOutbox();
    if (!entry) break;

    const success = await handler(entry);
    if (!success) {
      // Re-enqueue on failure
      await enqueueOutbox(entry.op, entry.table, entry.payload);
      break;
    }
    replayed++;
  }

  notifyStatusChange();
  return replayed;
}

/**
 * Get the number of pending outbox entries.
 */
export async function pendingCount(): Promise<number> {
  return pendingOutboxCount();
}

/**
 * Register a callback that fires when the outbox status changes.
 * Returns an unsubscribe function.
 */
export function onStatusChange(callback: StatusCallback): () => void {
  statusListeners.push(callback);
  return () => {
    const idx = statusListeners.indexOf(callback);
    if (idx !== -1) statusListeners.splice(idx, 1);
  };
}

function notifyStatusChange(): void {
  pendingOutboxCount().then((count) => {
    statusListeners.forEach((cb) => cb(count));
  });
}
