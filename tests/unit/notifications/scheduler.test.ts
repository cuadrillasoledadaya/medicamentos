import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapSubscriptionErrorToSpanish } from '@/features/notifications/scheduler';

/**
 * Unit tests for mapSubscriptionErrorToSpanish — DOMException name → Spanish message.
 *
 * Run: pnpm vitest run tests/unit/notifications/scheduler.test.ts
 */

describe('mapSubscriptionErrorToSpanish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps NotAllowedError to browser-blocked message', () => {
    const result = mapSubscriptionErrorToSpanish('NotAllowedError');
    expect(result).toBe(
      'Tu navegador bloqueó la suscripción. Usá una ventana normal o verificá los permisos.',
    );
  });

  it('maps AbortError to cancelled message', () => {
    const result = mapSubscriptionErrorToSpanish('AbortError');
    expect(result).toBe('La suscripción se canceló. Intentá de nuevo.');
  });

  it('maps SecurityError to HTTP/iframe context message', () => {
    const result = mapSubscriptionErrorToSpanish('SecurityError');
    expect(result).toBe(
      'La suscripción push no está disponible en este contexto (HTTP sin SSL o iframe).',
    );
  });

  it('maps unknown reason to fallback message and warns to console', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const originalUA = global.navigator?.userAgent;

    // Mock navigator.userAgent for the test
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 TestBrowser/1.0' },
      configurable: true,
    });

    const result = mapSubscriptionErrorToSpanish('SomeUnknownError');

    expect(result).toBe('No se pudo activar las notificaciones push. Intentá de nuevo.');
    expect(warnSpy).toHaveBeenCalledWith('SomeUnknownError', {
      userAgent: 'Mozilla/5.0 TestBrowser/1.0',
    });

    // Restore
    if (originalUA !== undefined) {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: originalUA },
        configurable: true,
      });
    }
    warnSpy.mockRestore();
  });

  it('maps empty/missing reason to fallback message', () => {
    const result = mapSubscriptionErrorToSpanish('');
    expect(result).toBe('No se pudo activar las notificaciones push. Intentá de nuevo.');
  });
});
