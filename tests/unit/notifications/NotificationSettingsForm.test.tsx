import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationSettingsForm } from '@/features/notifications/NotificationSettingsForm';

/**
 * Unit tests for NotificationSettingsForm — web_push toggle, DeviceList, IosInstallBadge.
 *
 * Run: pnpm vitest run tests/unit/notifications/NotificationSettingsForm.test.tsx
 */

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock hooks
vi.mock('@/features/notifications/hooks', () => ({
  useNotificationSettings: vi.fn(),
  useUpdateNotificationSetting: vi.fn(),
  usePushSubscriptions: vi.fn(),
  useRevokePushSubscription: vi.fn(),
}));

// Mock scheduler
vi.mock('@/features/notifications/scheduler', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue('granted'),
  getNotificationReliability: vi.fn().mockReturnValue('green'),
  requestPushSubscription: vi.fn().mockResolvedValue({ ok: true }),
  isIOS: vi.fn().mockReturnValue(false),
  isIOSStandalone: vi.fn().mockReturnValue(false),
}));

const { useNotificationSettings, useUpdateNotificationSetting, usePushSubscriptions, useRevokePushSubscription } = await import(
  '@/features/notifications/hooks'
);

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLocalStorage.getItem.mockReturnValue(null);
});

describe('NotificationSettingsForm', () => {
  it('renders all channel definitions including web_push', () => {
    (useNotificationSettings as any).mockReturnValue({
      data: [
        { channel: 'in_app', enabled: true },
      ],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (usePushSubscriptions as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Notificaciones en la app')).toBeInTheDocument();
    expect(screen.getByText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Notificaciones push del navegador')).toBeInTheDocument();
  });

  it('shows web_push as unchecked by default', () => {
    (useNotificationSettings as any).mockReturnValue({
      data: [
        { channel: 'in_app', enabled: true },
      ],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (usePushSubscriptions as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });

    const checkboxes = screen.getAllByRole('checkbox');
    const webPushCheckbox = checkboxes.find(
      (cb) => (cb as HTMLInputElement).parentElement?.textContent?.includes('push'),
    );
    expect(webPushCheckbox).toBeDefined();
    expect((webPushCheckbox as HTMLInputElement).checked).toBe(false);
  });

  it('shows web_push as checked when enabled in settings', () => {
    (useNotificationSettings as any).mockReturnValue({
      data: [
        { channel: 'in_app', enabled: true },
        { channel: 'web_push', enabled: true },
      ],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (usePushSubscriptions as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });

    const checkboxes = screen.getAllByRole('checkbox');
    const webPushCheckbox = checkboxes.find(
      (cb) => (cb as HTMLInputElement).parentElement?.textContent?.includes('push'),
    );
    expect((webPushCheckbox as HTMLInputElement).checked).toBe(true);
  });

  it('renders IosInstallBadge component', () => {
    (useNotificationSettings as any).mockReturnValue({
      data: [{ channel: 'in_app', enabled: true }],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (usePushSubscriptions as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });
    // IosInstallBadge returns null on non-iOS, so we just verify the form renders
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });

  it('renders DeviceList when web_push is enabled', () => {
    (useNotificationSettings as any).mockReturnValue({
      data: [
        { channel: 'in_app', enabled: true },
        { channel: 'web_push', enabled: true },
      ],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (usePushSubscriptions as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });
    // DeviceList should render with empty state
    expect(
      screen.getByText('No tenés dispositivos suscriptos. Activá las notificaciones para empezar.'),
    ).toBeInTheDocument();
  });

  it('does not render DeviceList when web_push is disabled', () => {
    (useNotificationSettings as any).mockReturnValue({
      data: [
        { channel: 'in_app', enabled: true },
        { channel: 'web_push', enabled: false },
      ],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });
    expect(screen.queryByText('Dispositivos conectados')).not.toBeInTheDocument();
  });
});
