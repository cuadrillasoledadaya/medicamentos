import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeviceList } from '@/features/notifications/DeviceList';

/**
 * Unit tests for DeviceList — renders push subscriptions with Revoke button.
 *
 * Run: pnpm vitest run tests/unit/notifications/DeviceList.test.tsx
 */

// Mock the hooks module
vi.mock('@/features/notifications/hooks', () => ({
  usePushSubscriptions: vi.fn(),
  useRevokePushSubscription: vi.fn(),
}));

// Mock parseDeviceName
vi.mock('@/features/notifications/pushSubscription', () => ({
  parseDeviceName: vi.fn((ua: string) => ua || 'Unknown browser'),
}));

const { usePushSubscriptions, useRevokePushSubscription } = await import(
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
});

const mockSubscriptions = [
  {
    id: 'sub-1',
    endpoint: 'https://fcm.googleapis.com/abc',
    device_name: 'Chrome on Android',
    is_active: true,
    created_at: '2026-06-26T08:00:00Z',
    last_seen_at: '2026-06-26T09:00:00Z',
  },
  {
    id: 'sub-2',
    endpoint: 'https://fcm.googleapis.com/xyz',
    device_name: 'Safari on iPhone',
    is_active: true,
    created_at: '2026-06-25T08:00:00Z',
    last_seen_at: '2026-06-25T10:00:00Z',
  },
];

describe('DeviceList', () => {
  it('shows loading state while fetching', () => {
    (usePushSubscriptions as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<DeviceList />, { wrapper: createWrapper() });
    expect(screen.getByText('Cargando dispositivos...')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', () => {
    (usePushSubscriptions as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    });

    render(<DeviceList />, { wrapper: createWrapper() });
    expect(
      screen.getByText('No pudimos cargar tus dispositivos. Intentá de nuevo.'),
    ).toBeInTheDocument();
  });

  it('shows empty state when no subscriptions', () => {
    (usePushSubscriptions as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<DeviceList />, { wrapper: createWrapper() });
    expect(
      screen.getByText(
        'No tenés dispositivos suscriptos. Activá las notificaciones para empezar.',
      ),
    ).toBeInTheDocument();
  });

  it('renders subscriptions with device name and Revoke button', () => {
    (usePushSubscriptions as any).mockReturnValue({
      data: mockSubscriptions,
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<DeviceList />, { wrapper: createWrapper() });
    expect(screen.getByText('Chrome on Android')).toBeInTheDocument();
    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();

    const revokeButtons = screen.getAllByRole('button', { name: /eliminar/i });
    expect(revokeButtons).toHaveLength(2);
  });

  it('shows last-seen relative time', () => {
    (usePushSubscriptions as any).mockReturnValue({
      data: mockSubscriptions,
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<DeviceList />, { wrapper: createWrapper() });
    // Should show some form of relative time (contains "hace" or a date)
    const timeElements = screen.getAllByText(/hace|última vez/i);
    expect(timeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows confirm dialog before deleting', async () => {
    const revokeFn = vi.fn().mockResolvedValue({ data: null, error: null });
    (usePushSubscriptions as any).mockReturnValue({
      data: mockSubscriptions,
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: revokeFn,
      isPending: false,
    });

    render(<DeviceList />, { wrapper: createWrapper() });

    const revokeButtons = screen.getAllByRole('button', { name: /eliminar/i });
    fireEvent.click(revokeButtons[0]);

    // Confirm dialog should appear — text is split across elements so check for parts
    expect(
      screen.getByText(/¿eliminar este dispositivo/i),
    ).toBeInTheDocument();

    // Confirm the deletion
    const confirmButton = screen.getByRole('button', { name: /^eliminar$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(revokeFn).toHaveBeenCalledWith('sub-1');
    });
  });

  it('cancels deletion when user clicks Cancel', () => {
    const revokeFn = vi.fn();
    (usePushSubscriptions as any).mockReturnValue({
      data: mockSubscriptions,
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: revokeFn,
      isPending: false,
    });

    render(<DeviceList />, { wrapper: createWrapper() });

    const revokeButtons = screen.getAllByRole('button', { name: /eliminar/i });
    fireEvent.click(revokeButtons[0]);

    // Cancel the deletion
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(revokeFn).not.toHaveBeenCalled();
  });

  it('disables Revoke button while mutation is pending', () => {
    (usePushSubscriptions as any).mockReturnValue({
      data: mockSubscriptions,
      isLoading: false,
      isError: false,
    });
    (useRevokePushSubscription as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });

    render(<DeviceList />, { wrapper: createWrapper() });
    const revokeButtons = screen.getAllByRole('button', { name: /eliminar/i });
    revokeButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
