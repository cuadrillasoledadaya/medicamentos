// AppShell: top bar with multi-paciente selector, main content area, status footer.
// - Desktop (>768px): horizontal nav in header.
// - Mobile (<=768px): bottom tabbar with 5 primary sections + "Más" sheet with the rest.

import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { usePacientes } from '../features/pacientes/hooks';
import { useActivePaciente } from '../stores/activePaciente';
import { OutboxIndicator } from '../features/tomas/OutboxIndicator';
import { NotificationPermissionPrompt } from '../features/notifications/NotificationPermissionPrompt';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { MoreSheet } from './MoreSheet';
import './AppShell.css';

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/medications', label: 'Medicamentos' },
  { to: '/calendar', label: 'Calendario' },
  { to: '/adherence', label: 'Adherencia' },
  { to: '/stock', label: 'Stock' },
  { to: '/vacations', label: 'Vacaciones' },
  { to: '/retention', label: 'Retención' },
  { to: '/reports/export', label: 'Reportes' },
  { to: '/travel', label: 'Viajes' },
  { to: '/admin/interactions', label: 'Interacciones' },
  { to: '/settings', label: 'Ajustes' },
];

// Primary mobile tabbar — the 5 most-used sections for a cuidador on the go.
const primaryNavItems = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/medications', label: 'Medicamentos', icon: '💊' },
  { to: '/calendar', label: 'Calendario', icon: '📅' },
  { to: '/pacientes', label: 'Pacientes', icon: '👥' },
  { to: '/__more__', label: 'Más', icon: '☰' },
];

export function AppShell() {
  const { data: pacientes } = usePacientes();
  const { activePacienteId, setActivePaciente } = useActivePaciente();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [moreOpen, setMoreOpen] = useState(false);

  const activePaciente = pacientes?.find((p) => p.id === activePacienteId);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Top bar */}
      <header
        className="app-header"
        style={{
          background: '#0ea5e9',
          color: '#fff',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Medicamentos</h1>

        {/* Multi-paciente selector */}
        {pacientes && pacientes.length > 0 && (
          <select
            className="paciente-selector"
            value={activePacienteId ?? ''}
            onChange={(e) => setActivePaciente(e.target.value || null)}
            style={styles.selector}
            title="Seleccionar paciente activo"
          >
            <option value="">— Seleccionar paciente —</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <OutboxIndicator />

        {/* Desktop nav — hidden on mobile via CSS */}
        {!isMobile && (
          <nav
            className="desktop-nav"
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  fontWeight: isActive ? 'bold' : 'normal',
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Active paciente banner */}
      {activePaciente && (
        <div style={styles.banner}>
          Paciente activo: <strong>{activePaciente.name}</strong>
          <span style={styles.tz}>({activePaciente.timezone_id})</span>
        </div>
      )}

      {/* Main content */}
      <main className="app-main" style={{ flex: 1, padding: '1rem' }}>
        <Outlet />
      </main>

      {/* Status footer (desktop only) */}
      <footer
        className="app-footer"
        style={{
          padding: '0.5rem 1rem',
          background: '#f5f5f5',
          fontSize: '0.75rem',
          color: '#888',
          textAlign: 'center',
        }}
      >
        Medicamentos PWA — v1
      </footer>

      {/* Mobile bottom tabbar — visible only on mobile via CSS */}
      {isMobile && (
        <nav className="mobile-tabbar" aria-label="Navegación principal">
          {primaryNavItems.map((item) => {
            if (item.to === '/__more__') {
              return (
                <button
                  key={item.to}
                  type="button"
                  className={moreOpen ? 'active' : ''}
                  onClick={() => setMoreOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={moreOpen}
                >
                  <span className="tabbar-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="tabbar-label">{item.label}</span>
                </button>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <span className="tabbar-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="tabbar-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}

      {/* "Más" sheet — only mounted on mobile, opens on tab tap */}
      {isMobile && <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />}

      {/* Notification permission prompt */}
      <NotificationPermissionPrompt />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  selector: {
    padding: '0.375rem 0.5rem',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '0.875rem',
    cursor: 'pointer',
    maxWidth: '200px',
  },
  banner: {
    padding: '0.375rem 1rem',
    background: '#e0f2fe',
    fontSize: '0.8rem',
    color: '#0369a1',
    textAlign: 'center',
  },
  tz: { color: '#6b7280', marginLeft: '0.25rem' },
};
