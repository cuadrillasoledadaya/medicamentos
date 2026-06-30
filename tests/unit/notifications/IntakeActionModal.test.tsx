import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * Unit tests for IntakeActionModal.
 *
 * Run: pnpm vitest run tests/unit/notifications/IntakeActionModal.test.tsx
 */

const mockMarkTaken = vi.fn();
const mockMarkSkipped = vi.fn();
const mockSnoozeRpc = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockSnoozeRpc(...args),
  },
}));

vi.mock('@/features/tomas/hooks', () => ({
  useMarkTomaTaken: () => ({ mutate: mockMarkTaken }),
  useMarkTomaSkipped: () => ({ mutate: mockMarkSkipped }),
}));

// Import after mocks
const { IntakeActionModal } = await import('@/features/notifications/IntakeActionModal');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('IntakeActionModal', () => {
  it('renders nothing when open=false', () => {
    render(<IntakeActionModal tomaId="abc" open={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/qué querés hacer/i)).toBeNull();
  });

  it('renders 3 action buttons when open=true', () => {
    render(<IntakeActionModal tomaId="abc" open onClose={vi.fn()} />);
    expect(screen.getByText('Marcar como tomada')).toBeTruthy();
    expect(screen.getByText('Posponer 10 min')).toBeTruthy();
    expect(screen.getByText('Saltar')).toBeTruthy();
  });

  it('calls mark-taken mutation and onClose on taken button click', () => {
    const onClose = vi.fn();
    render(<IntakeActionModal tomaId="abc123" open onClose={onClose} />);

    fireEvent.click(screen.getByText('Marcar como tomada'));

    expect(mockMarkTaken).toHaveBeenCalledWith({
      tomaId: 'abc123',
      takenAt: expect.any(String),
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls snooze RPC and onClose on snooze button click', async () => {
    const onClose = vi.fn();
    render(<IntakeActionModal tomaId="xyz789" open onClose={onClose} />);

    fireEvent.click(screen.getByText('Posponer 10 min'));

    await vi.waitFor(() => {
      expect(mockSnoozeRpc).toHaveBeenCalledWith('snooze_toma', { p_toma_id: 'xyz789' });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls mark-skipped mutation and onClose on skip button click', () => {
    const onClose = vi.fn();
    render(<IntakeActionModal tomaId="def456" open onClose={onClose} />);

    fireEvent.click(screen.getByText('Saltar'));

    expect(mockMarkSkipped).toHaveBeenCalledWith({
      tomaId: 'def456',
      reason: 'notification-skip',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<IntakeActionModal tomaId="abc" open onClose={onClose} />);

    fireEvent.click(screen.getByTestId('modal-backdrop'));

    expect(onClose).toHaveBeenCalled();
  });
});
