import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const DB_NAME = 'medication-tracker';

afterEach(() => {
  cleanup();
  // Reset fake-indexeddb between tests
  indexedDB.deleteDatabase(DB_NAME);
});
