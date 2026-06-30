import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Unit tests for useNotificationDeepLinkAction hook.
 *
 * Run: pnpm vitest run tests/unit/hooks/useNotificationDeepLinkAction.test.tsx
 */

const mockNavigate = vi.fn();
const mockSnoozeRpc = vi.fn(() => Promise.resolve({ error: null }));
const mockMarkTaken = vi.fn();
const mockMarkSkipped = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  },
}));

vi.mock('@/features/tomas/hooks', () => ({
  useMarkTomaTaken: () => ({ mutate: mockMarkTaken }),
  useMarkTomaSkipped: () => ({ mutate: mockMarkSkipped }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Import after mocks
const { supabase } = await import('@/lib/supabase');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useNotificationDeepLinkAction', () => {
  it('fires snooze RPC and navigates when ?action=snooze&tomaId= set', async () => {
    const { useNotificationDeepLinkAction } = await import('@/hooks/useNotificationDeepLinkAction');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/today?tomaId=abc123&action=snooze']}>
        {children}
      </MemoryRouter>
    );

    renderHook(() => useNotificationDeepLinkAction(), { wrapper });

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('snooze_toma', { p_toma_id: 'abc123' });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/today', { replace: true });
  });

  it('fires mark-taken mutation when ?action=taken', async () => {
    const { useNotificationDeepLinkAction } = await import('@/hooks/useNotificationDeepLinkAction');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/today?tomaId=xyz789&action=taken']}>
        {children}
      </MemoryRouter>
    );

    renderHook(() => useNotificationDeepLinkAction(), { wrapper });

    await waitFor(() => {
      expect(mockMarkTaken).toHaveBeenCalledWith({
        tomaId: 'xyz789',
        takenAt: expect.any(String),
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/today', { replace: true });
  });

  it('fires mark-skipped mutation when ?action=skip', async () => {
    const { useNotificationDeepLinkAction } = await import('@/hooks/useNotificationDeepLinkAction');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/today?tomaId=def456&action=skip']}>
        {children}
      </MemoryRouter>
    );

    renderHook(() => useNotificationDeepLinkAction(), { wrapper });

    await waitFor(() => {
      expect(mockMarkSkipped).toHaveBeenCalledWith({
        tomaId: 'def456',
        reason: 'notification-skip',
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/today', { replace: true });
  });

  it('does nothing when no ?action= param', async () => {
    const { useNotificationDeepLinkAction } = await import('@/hooks/useNotificationDeepLinkAction');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/today?tomaId=abc123']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useNotificationDeepLinkAction(), { wrapper });

    await new Promise((r) => setTimeout(r, 100));

    expect(result.current.status).toBe('idle');
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(mockMarkTaken).not.toHaveBeenCalled();
    expect(mockMarkSkipped).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('transitions to "done" after successful action', async () => {
    const { useNotificationDeepLinkAction } = await import('@/hooks/useNotificationDeepLinkAction');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/today?tomaId=done123&action=snooze']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useNotificationDeepLinkAction(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('done');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/today', { replace: true });
  });

  it('transitions to "error" when RPC fails', async () => {
    vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('RPC failed'));

    const { useNotificationDeepLinkAction } = await import('@/hooks/useNotificationDeepLinkAction');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/today?tomaId=err123&action=snooze']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useNotificationDeepLinkAction(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('transitions to "error" for unknown action value', async () => {
    const { useNotificationDeepLinkAction } = await import('@/hooks/useNotificationDeepLinkAction');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/today?tomaId=bad123&action=unknown']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useNotificationDeepLinkAction(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
