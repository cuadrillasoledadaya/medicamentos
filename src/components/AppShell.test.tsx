/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AppShell } from './AppShell';

// Mock all transitive dependencies
vi.mock('../hooks/useMediaQuery', () => ({
  useMediaQuery: () => false, // desktop viewport
}));

vi.mock('../features/pacientes/hooks', () => ({
  usePacientes: () => ({ data: [] }),
}));

vi.mock('../stores/activePaciente', () => ({
  useActivePaciente: () => ({
    activePacienteId: null,
    setActivePaciente: vi.fn(),
  }),
}));

vi.mock('../features/tomas/OutboxIndicator', () => ({
  OutboxIndicator: () => null,
}));

vi.mock('../features/notifications/NotificationPermissionPrompt', () => ({
  NotificationPermissionPrompt: () => null,
}));

vi.mock('./MoreSheet', () => ({
  MoreSheet: () => null,
}));

function renderAppShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
          <Route path="/notifications" element={<div data-testid="notifications-page">Notifications</div>} />
          <Route path="*" element={<Outlet />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell desktop nav', () => {
  describe('Notificaciones entry (R1)', () => {
    it('renders a NavLink with href="/notifications" and visible text "Notificaciones" inside .desktop-nav', () => {
      renderAppShell();
      const nav = document.querySelector('.desktop-nav');
      expect(nav).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /notificaciones/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/notifications');
      expect(nav).toContainElement(link);
    });
  });

  describe('Position before Ajustes (R3)', () => {
    it('Notificaciones entry appears immediately before Ajustes in .desktop-nav link order', () => {
      renderAppShell();
      const nav = document.querySelector('.desktop-nav');
      const links = nav?.querySelectorAll('a') ?? [];
      const hrefs = Array.from(links).map((l) => l.getAttribute('href'));

      const notifsIdx = hrefs.indexOf('/notifications');
      const ajustesIdx = hrefs.indexOf('/settings');

      expect(notifsIdx).toBeGreaterThanOrEqual(0);
      expect(ajustesIdx).toBeGreaterThanOrEqual(0);
      expect(ajustesIdx - notifsIdx).toBe(1);
    });
  });

  describe('Pre-existing entries preserved (R4)', () => {
    it('all 12 pre-existing entries are present in original relative order', () => {
      renderAppShell();
      const nav = document.querySelector('.desktop-nav');
      const links = nav?.querySelectorAll('a') ?? [];
      const hrefs = Array.from(links).map((l) => l.getAttribute('href'));

      const expected = [
        '/',
        '/pacientes',
        '/medications',
        '/calendar',
        '/adherence',
        '/stock',
        '/vacations',
        '/retention',
        '/reports/export',
        '/travel',
        '/admin/interactions',
        '/settings',
      ];

      let lastIndex = -1;
      for (const href of expected) {
        const idx = hrefs.indexOf(href);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeGreaterThan(lastIndex);
        lastIndex = idx;
      }
    });
  });
});
