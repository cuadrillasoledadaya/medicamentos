import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  mapSubscriptionErrorToSpanish: vi.fn((reason: string) => {
    if (reason === 'NotAllowedError') return 'Tu navegador bloqueó la suscripción. Usá una ventana normal o verificá los permisos.';
    if (reason === 'AbortError') return 'La suscripción se canceló. Intentá de nuevo.';
    if (reason === 'SecurityError') return 'La suscripción push no está disponible en este contexto (HTTP sin SSL o iframe).';
    return 'No se pudo activar las notificaciones push. Intentá de nuevo.';
  }),
}));

const { useNotificationSettings, useUpdateNotificationSetting, usePushSubscriptions, useRevokePushSubscription } = await import(
  '@/features/notifications/hooks'
);
const { requestPushSubscription } = await import('@/features/notifications/scheduler');

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

  it('mutate called before subscribe when rejecting — checkbox stays checked, Spanish banner shown', async () => {
    const mutateFn = vi.fn();
    (useNotificationSettings as any).mockReturnValue({
      data: [{ channel: 'in_app', enabled: true }],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: mutateFn,
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
    vi.mocked(requestPushSubscription).mockResolvedValueOnce({
      ok: false,
      reason: 'NotAllowedError',
    });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });

    // Find and click the web_push checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    const webPushCheckbox = checkboxes.find(
      (cb) => (cb as HTMLInputElement).parentElement?.textContent?.includes('push'),
    )!;
    fireEvent.click(webPushCheckbox);

    // Assert mutate was called FIRST with enabled:true
    expect(mutateFn).toHaveBeenCalledWith({
      pacienteId: 'pac-1',
      channel: 'web_push',
      enabled: true,
    });

    // Spanish banner text appears after async handshake resolves
    expect(
      await screen.findByText('Tu navegador bloqueó la suscripción. Usá una ventana normal o verificá los permisos.'),
    ).toBeInTheDocument();

    // Checkbox stays checked after failure (user intent preserved)
    expect((webPushCheckbox as HTMLInputElement).checked).toBe(true);

    // Raw NotAllowedError is NOT in the DOM
    expect(screen.queryByText('NotAllowedError')).not.toBeInTheDocument();

    // Reintentar button is in the DOM
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('toggle OFF resets state to idle and does not call subscribe', async () => {
    const mutateFn = vi.fn();
    // Start with web_push already enabled in settings
    (useNotificationSettings as any).mockReturnValue({
      data: [{ channel: 'in_app', enabled: true }, { channel: 'web_push', enabled: true }],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: mutateFn,
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
    )!;

    // Toggle OFF — should NOT call requestPushSubscription
    fireEvent.click(webPushCheckbox);

    // Mutate called with enabled: false
    expect(mutateFn).toHaveBeenCalledWith({
      pacienteId: 'pac-1',
      channel: 'web_push',
      enabled: false,
    });

    // requestPushSubscription was NOT called (no subscribe on toggle-OFF)
    expect(requestPushSubscription).not.toHaveBeenCalled();

    // No badge visible (state is idle)
    expect(screen.queryByText('Push activo')).not.toBeInTheDocument();
    expect(screen.queryByText('Pendiente…')).not.toBeInTheDocument();
    expect(screen.queryByText('Push no configurado')).not.toBeInTheDocument();
  });

  it('toggle is disabled while pending', async () => {
    const mutateFn = vi.fn();
    (useNotificationSettings as any).mockReturnValue({
      data: [{ channel: 'in_app', enabled: true }],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: mutateFn,
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
    // Return a never-resolving promise to keep state pending
    let resolvePromise: () => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve as () => void;
    });
    vi.mocked(requestPushSubscription).mockReturnValueOnce(pendingPromise as any);

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });

    const checkboxes = screen.getAllByRole('checkbox');
    const webPushCheckbox = checkboxes.find(
      (cb) => (cb as HTMLInputElement).parentElement?.textContent?.includes('push'),
    )!;

    fireEvent.click(webPushCheckbox);

    // Wait for pending badge to appear
    await screen.findByText('Pendiente…');

    // Checkbox is disabled while pending
    expect((webPushCheckbox as HTMLInputElement).disabled).toBe(true);

    // Clean up: resolve the pending promise with a value to avoid unhandled rejection
    resolvePromise!({ ok: true } as any);
    // Wait for React to process the state update
    await new Promise((r) => setTimeout(r, 0));
  });

  it('unknown error maps to fallback Spanish message', async () => {
    const mutateFn = vi.fn();
    (useNotificationSettings as any).mockReturnValue({
      data: [{ channel: 'in_app', enabled: true }],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: mutateFn,
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
    vi.mocked(requestPushSubscription).mockResolvedValueOnce({
      ok: false,
      reason: 'SomeWeirdError',
    });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });

    const checkboxes = screen.getAllByRole('checkbox');
    const webPushCheckbox = checkboxes.find(
      (cb) => (cb as HTMLInputElement).parentElement?.textContent?.includes('push'),
    )!;
    fireEvent.click(webPushCheckbox);

    expect(mutateFn).toHaveBeenCalledWith({
      pacienteId: 'pac-1',
      channel: 'web_push',
      enabled: true,
    });

    // Fallback Spanish message appears in the banner
    await waitFor(() => {
      expect(screen.getByText(/No se pudo activar las notificaciones push/)).toBeInTheDocument();
    });

    // Raw error name is NOT in the DOM
    expect(screen.queryByText('SomeWeirdError')).not.toBeInTheDocument();
  });

  it('DeviceList renders after successful subscribe', async () => {
    const mutateFn = vi.fn();
    (useNotificationSettings as any).mockReturnValue({
      data: [{ channel: 'in_app', enabled: true }],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: mutateFn,
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
    vi.mocked(requestPushSubscription).mockResolvedValueOnce({ ok: true });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });

    const checkboxes = screen.getAllByRole('checkbox');
    const webPushCheckbox = checkboxes.find(
      (cb) => (cb as HTMLInputElement).parentElement?.textContent?.includes('push'),
    )!;
    fireEvent.click(webPushCheckbox);

    // Success → subscribed state
    await screen.findByText('Push activo');

    // DeviceList renders with empty-state message
    expect(
      screen.getByText('No tenés dispositivos suscriptos. Activá las notificaciones para empezar.'),
    ).toBeInTheDocument();
  });

  it('Reintentar re-runs subscribe without re-mutate', async () => {
    const mutateFn = vi.fn();
    (useNotificationSettings as any).mockReturnValue({
      data: [{ channel: 'in_app', enabled: true }],
      isLoading: false,
    });
    (useUpdateNotificationSetting as any).mockReturnValue({
      mutate: mutateFn,
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
    // First attempt fails
    vi.mocked(requestPushSubscription).mockResolvedValueOnce({
      ok: false,
      reason: 'NotAllowedError',
    });
    // Second attempt succeeds
    vi.mocked(requestPushSubscription).mockResolvedValueOnce({ ok: true });

    render(<NotificationSettingsForm pacienteId="pac-1" />, { wrapper: createWrapper() });

    const checkboxes = screen.getAllByRole('checkbox');
    const webPushCheckbox = checkboxes.find(
      (cb) => (cb as HTMLInputElement).parentElement?.textContent?.includes('push'),
    )!;
    fireEvent.click(webPushCheckbox);

    // First call: mutate called once
    expect(mutateFn).toHaveBeenCalledTimes(1);
    expect(mutateFn).toHaveBeenCalledWith({
      pacienteId: 'pac-1',
      channel: 'web_push',
      enabled: true,
    });

    // Wait for failure banner
    await screen.findByText(/Tu navegador bloqueó la suscripción/);

    // Click Reintentar
    const retryBtn = screen.getByRole('button', { name: 'Reintentar' });
    fireEvent.click(retryBtn);

    // mutate NOT called again
    expect(mutateFn).toHaveBeenCalledTimes(1);

    // Second attempt succeeds → subscribed
    await screen.findByText('Push activo');
    expect(screen.queryByText(/Tu navegador bloqueó la suscripción/)).not.toBeInTheDocument();
  });
});
