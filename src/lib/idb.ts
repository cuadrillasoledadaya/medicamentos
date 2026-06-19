// IndexedDB wrapper using idb.
// Stores: outbox, cached_medications, cached_today_tomas, cached_patients.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Medication, Paciente, Toma } from './database.types';

interface OutboxEntry {
  id?: number;
  op: 'insert' | 'update' | 'delete';
  table: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

interface MedicationCache {
  id: string;
  data: Medication;
}

interface TomaCache {
  id: string;
  data: Toma;
}

interface PacienteCache {
  id: string;
  data: Paciente;
}

interface MedsDB extends DBSchema {
  outbox: {
    key: number;
    value: OutboxEntry;
  };
  cached_medications: {
    key: string;
    value: MedicationCache;
  };
  cached_today_tomas: {
    key: string;
    value: TomaCache;
  };
  cached_patients: {
    key: string;
    value: PacienteCache;
  };
}

const DB_NAME = 'medication-tracker';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MedsDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<MedsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MedsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('outbox', {
          keyPath: 'id',
          autoIncrement: true,
        });
        db.createObjectStore('cached_medications', { keyPath: 'id' });
        db.createObjectStore('cached_today_tomas', { keyPath: 'id' });
        db.createObjectStore('cached_patients', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

// Outbox helpers

export async function enqueueOutbox(
  op: OutboxEntry['op'],
  table: string,
  payload: Record<string, unknown>,
): Promise<number> {
  const db = await getDb();
  return db.add('outbox', {
    op,
    table,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  });
}

export async function dequeueOutbox(): Promise<OutboxEntry | undefined> {
  const db = await getDb();
  const tx = db.transaction('outbox', 'readwrite');
  const cursor = await tx.store.openCursor();
  if (!cursor) return undefined;
  const entry = cursor.value;
  await cursor.delete();
  await tx.done;
  return entry;
}

export async function pendingOutboxCount(): Promise<number> {
  const db = await getDb();
  return db.count('outbox');
}

// Medication cache helpers

export async function cacheMedications(list: Medication[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('cached_medications', 'readwrite');
  // Clear existing entries for this batch
  await tx.store.clear();
  for (const med of list) {
    await tx.store.put({ id: med.id, data: med });
  }
  await tx.done;
}

export async function getCachedMedications(
  _pacienteId?: string,
): Promise<Medication[]> {
  const db = await getDb();
  const all = await db.getAll('cached_medications');
  return all.map((entry) => entry.data);
}

// Tomas cache helpers

export async function cacheTodayTomas(list: Toma[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('cached_today_tomas', 'readwrite');
  await tx.store.clear();
  for (const toma of list) {
    await tx.store.put({ id: toma.id, data: toma });
  }
  await tx.done;
}

export async function getCachedTodayTomas(): Promise<Toma[]> {
  const db = await getDb();
  const all = await db.getAll('cached_today_tomas');
  return all.map((entry) => entry.data);
}

// Pacientes cache helpers

export async function cachePatients(list: Paciente[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('cached_patients', 'readwrite');
  await tx.store.clear();
  for (const p of list) {
    await tx.store.put({ id: p.id, data: p });
  }
  await tx.done;
}

export async function getCachedPatients(): Promise<Paciente[]> {
  const db = await getDb();
  const all = await db.getAll('cached_patients');
  return all.map((entry) => entry.data);
}

// Clear all caches (e.g., on sign-out)

export async function clearAllCaches(): Promise<void> {
  const db = await getDb();
  await db.clear('cached_medications');
  await db.clear('cached_today_tomas');
  await db.clear('cached_patients');
  await db.clear('outbox');
}
