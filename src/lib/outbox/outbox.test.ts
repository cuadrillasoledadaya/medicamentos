import { describe, it, expect, beforeEach } from 'vitest';
import { enqueue, replay, pendingCount, onStatusChange } from '@/lib/outbox';

describe('outbox', () => {
  beforeEach(async () => {
    // Drain any leftover entries
    while (await pendingCount() > 0) {
      await replay(async () => true);
    }
  });

  it('enqueue persists an entry and increments count', async () => {
    const before = await pendingCount();
    await enqueue('insert', 'tomas', { schedule_id: 'test-1', status: 'pending' });
    const after = await pendingCount();
    expect(after).toBe(before + 1);
  });

  it('replay drains queue when handler succeeds', async () => {
    await enqueue('insert', 'tomas', { id: 'a' });
    await enqueue('update', 'tomas', { id: 'b' });

    const handled: unknown[] = [];
    const replayed = await replay(async (entry) => {
      handled.push(entry.payload);
      return true;
    });

    expect(replayed).toBe(2);
    expect(handled).toHaveLength(2);
    expect(await pendingCount()).toBe(0);
  });

  it('replay stops and re-enqueues on handler failure', async () => {
    await enqueue('insert', 'tomas', { id: 'ok' });
    await enqueue('insert', 'tomas', { id: 'fail' });
    await enqueue('insert', 'tomas', { id: 'after-fail' });

    const handled: unknown[] = [];
    const replayed = await replay(async (entry) => {
      handled.push(entry.payload);
      if ((entry.payload as { id: string }).id === 'fail') return false;
      return true;
    });

    // First entry succeeds, second fails → stops, second re-enqueued
    expect(replayed).toBe(1);
    // The failed entry + the third entry are still in queue
    expect(await pendingCount()).toBe(2);
  });

  it('pendingCount reflects queue size accurately', async () => {
    expect(await pendingCount()).toBe(0);

    await enqueue('insert', 'tomas', { id: '1' });
    expect(await pendingCount()).toBe(1);

    await enqueue('insert', 'tomas', { id: '2' });
    await enqueue('insert', 'tomas', { id: '3' });
    expect(await pendingCount()).toBe(3);

    await replay(async () => true);
    expect(await pendingCount()).toBe(0);
  });

  it('onStatusChange callback fires when queue changes', async () => {
    const counts: number[] = [];
    const unsub = onStatusChange((count) => {
      counts.push(count);
    });

    await enqueue('insert', 'tomas', { id: 'x' });
    // Give the async notifyStatusChange time to fire
    await new Promise((r) => setTimeout(r, 50));

    expect(counts.length).toBeGreaterThanOrEqual(1);
    expect(counts[counts.length - 1]).toBe(1);

    unsub();
    await replay(async () => true);
    await new Promise((r) => setTimeout(r, 50));
    // After unsub, no new callbacks should fire
    const finalLen = counts.length;
    await enqueue('insert', 'tomas', { id: 'y' });
    await new Promise((r) => setTimeout(r, 50));
    expect(counts.length).toBe(finalLen);
  });
});
