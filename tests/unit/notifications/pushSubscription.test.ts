import { describe, it, expect } from 'vitest';
import { parseDeviceName } from '@/features/notifications/pushSubscription';

/**
 * Unit tests for parseDeviceName — UA string → short label.
 *
 * Run: pnpm vitest run tests/unit/notifications/pushSubscription.test.ts
 */

describe('parseDeviceName', () => {
  it('detects Chrome on Android', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    expect(parseDeviceName(ua)).toBe('Chrome on Android');
  });

  it('detects Firefox on Linux', () => {
    const ua =
      'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';
    expect(parseDeviceName(ua)).toBe('Firefox on Linux');
  });

  it('detects Safari on iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
    expect(parseDeviceName(ua)).toBe('Safari on iPhone');
  });

  it('detects Safari on iPad', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
    expect(parseDeviceName(ua)).toBe('Safari on iPad');
  });

  it('detects Chrome on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(parseDeviceName(ua)).toBe('Chrome on Windows');
  });

  it('detects Firefox on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0';
    expect(parseDeviceName(ua)).toBe('Firefox on macOS');
  });

  it('detects Safari on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
    expect(parseDeviceName(ua)).toBe('Safari on macOS');
  });

  it('detects Edge on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    expect(parseDeviceName(ua)).toBe('Edge on Windows');
  });

  it('returns "Unknown browser" for unrecognizable UA', () => {
    expect(parseDeviceName('some-random-string')).toBe('Unknown browser');
  });

  it('returns "Unknown browser" for empty string', () => {
    expect(parseDeviceName('')).toBe('Unknown browser');
  });

  it('detects Chrome on iPad (iPadOS reports as MacIntel)', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1';
    expect(parseDeviceName(ua)).toBe('Chrome on iPad');
  });

  it('detects Samsung Internet on Android', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36';
    expect(parseDeviceName(ua)).toBe('Samsung Internet on Android');
  });
});
