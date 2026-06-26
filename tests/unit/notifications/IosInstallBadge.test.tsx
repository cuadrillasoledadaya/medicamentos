import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IosInstallBadge } from '@/features/notifications/IosInstallBadge';

/**
 * Unit tests for IosInstallBadge — iOS PWA install reminder.
 *
 * Run: pnpm vitest run tests/unit/notifications/IosInstallBadge.test.tsx
 */

// Mock scheduler module
vi.mock('@/features/notifications/scheduler', () => ({
  isIOSStandalone: vi.fn(),
  isIOS: vi.fn(),
}));

const { isIOSStandalone, isIOS } = await import('@/features/notifications/scheduler');

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockLocalStorage.getItem.mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IosInstallBadge', () => {
  it('is visible when iOS and not standalone', () => {
    (isIOSStandalone as any).mockReturnValue(false);
    (isIOS as any).mockReturnValue(true);

    render(<IosInstallBadge />);
    expect(screen.getByText(/para recibir notificaciones en iphone/i)).toBeInTheDocument();
  });

  it('is hidden when iOS and standalone (PWA installed)', () => {
    (isIOSStandalone as any).mockReturnValue(true);
    (isIOS as any).mockReturnValue(true);

    const { container } = render(<IosInstallBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('is hidden when not iOS (Android)', () => {
    (isIOSStandalone as any).mockReturnValue(false);
    (isIOS as any).mockReturnValue(false);

    const { container } = render(<IosInstallBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('dismisses and persists to localStorage', () => {
    (isIOSStandalone as any).mockReturnValue(false);
    (isIOS as any).mockReturnValue(true);

    render(<IosInstallBadge />);
    const dismissButton = screen.getByRole('button', { name: /cerrar aviso/i });
    fireEvent.click(dismissButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('ios-install-badge-dismissed', 'true');
    expect(screen.queryByText(/para recibir notificaciones en iphone/i)).not.toBeInTheDocument();
  });

  it('stays hidden if previously dismissed', () => {
    mockLocalStorage.getItem.mockReturnValue('true');
    (isIOSStandalone as any).mockReturnValue(false);
    (isIOS as any).mockReturnValue(true);

    const { container } = render(<IosInstallBadge />);
    expect(container.firstChild).toBeNull();
  });
});
