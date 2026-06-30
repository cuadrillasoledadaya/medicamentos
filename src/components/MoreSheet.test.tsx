/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MoreSheet } from './MoreSheet';

function renderMoreSheet() {
  const onClose = vi.fn();
  const utils = render(
    <MemoryRouter>
      <MoreSheet open={true} onClose={onClose} />
    </MemoryRouter>,
  );
  return { ...utils, onClose };
}

describe('MoreSheet', () => {
  describe('Notificaciones entry (R1)', () => {
    it('renders a NavLink with href="/notifications" and visible text "Notificaciones"', () => {
      renderMoreSheet();
      const link = screen.getByRole('link', { name: /notificaciones/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/notifications');
    });

    it('renders the bell icon in the entry', () => {
      renderMoreSheet();
      const link = screen.getByRole('link', { name: /notificaciones/i });
      const iconSpan = link.querySelector('.more-icon');
      expect(iconSpan).toHaveTextContent('🔔');
    });
  });

  describe('Tap navigates and closes (R2)', () => {
    it('calls onClose when the Notificaciones link is clicked', () => {
      const { onClose } = renderMoreSheet();
      const link = screen.getByRole('link', { name: /notificaciones/i });
      fireEvent.click(link);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Position before Ajustes (R3)', () => {
    it('Notificaciones entry appears immediately before Ajustes in DOM order', () => {
      renderMoreSheet();
      const links = screen.getAllByRole('link');
      const notifsIdx = links.findIndex(
        (l) => l.getAttribute('href') === '/notifications',
      );
      const ajustesIdx = links.findIndex(
        (l) => l.getAttribute('href') === '/settings',
      );
      expect(notifsIdx).toBeGreaterThanOrEqual(0);
      expect(ajustesIdx).toBeGreaterThanOrEqual(0);
      expect(ajustesIdx - notifsIdx).toBe(1);
    });
  });

  describe('Pre-existing entries preserved (R4)', () => {
    it('all 8 pre-existing entries are present in original relative order', () => {
      renderMoreSheet();
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));

      const expected = [
        '/adherence',
        '/stock',
        '/vacations',
        '/retention',
        '/reports/export',
        '/travel',
        '/admin/interactions',
        '/settings',
      ];

      // Each expected href should appear, and in the right relative order
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
