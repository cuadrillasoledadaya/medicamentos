import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TodayPage from '@/pages/TodayPage';

/**
 * Unit tests for TodayPage — the deep-link landing page for push notifications.
 *
 * Run: pnpm vitest run tests/unit/pages/TodayPage.test.tsx
 */

// Mock the TodayList component to avoid Supabase API calls in unit tests
vi.mock('@/features/tomas/TodayList', () => ({
  TodayList: ({ pacienteId, highlightTomaId }: { pacienteId: string; highlightTomaId?: string }) => (
    <div data-testid="today-list" data-paciente-id={pacienteId} data-highlight={highlightTomaId || ''}>
      TodayList mock
    </div>
  ),
}));

// Mock useActivePaciente to provide a test pacienteId
vi.mock('@/stores/activePaciente', () => ({
  useActivePaciente: () => ({ activePacienteId: 'test-paciente-uuid' }),
}));

describe('TodayPage', () => {
  it('renders TodayList at /today', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <TodayPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('today-list')).toBeInTheDocument();
    expect(screen.getByTestId('today-list').getAttribute('data-paciente-id')).toBe('test-paciente-uuid');
  });

  it('passes highlightTomaId when ?tomaId= is present', () => {
    const tomaId = 'some-uuid-123';
    render(
      <MemoryRouter initialEntries={[`/today?tomaId=${tomaId}`]}>
        <TodayPage />
      </MemoryRouter>,
    );

    const list = screen.getByTestId('today-list');
    expect(list.getAttribute('data-highlight')).toBe(tomaId);
  });

  it('does not pass highlightTomaId when ?tomaId= is absent', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <TodayPage />
      </MemoryRouter>,
    );

    const list = screen.getByTestId('today-list');
    expect(list.getAttribute('data-highlight')).toBe('');
  });
});
