// MoreSheet — bottom sheet shown when the user taps the "Más" tab in the
// mobile tabbar. Lists the secondary navigation items (the ones that don't
// fit in the bottom tabbar). Closes on backdrop tap or Escape key.

import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';

interface MoreItem {
  to: string;
  label: string;
  icon: string;
}

const moreItems: MoreItem[] = [
  { to: '/adherence', label: 'Adherencia', icon: '📊' },
  { to: '/stock', label: 'Stock', icon: '📦' },
  { to: '/vacations', label: 'Vacaciones', icon: '🏖️' },
  { to: '/retention', label: 'Retención', icon: '🗄️' },
  { to: '/reports/export', label: 'Reportes', icon: '📄' },
  { to: '/travel', label: 'Viajes', icon: '✈️' },
  { to: '/admin/interactions', label: 'Interacciones', icon: '⚠️' },
  { to: '/settings', label: 'Ajustes', icon: '⚙️' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MoreSheet({ open, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="more-sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="more-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Más secciones"
      >
        <h2>Más secciones</h2>
        <nav className="more-sheet-grid">
          {moreItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="more-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
