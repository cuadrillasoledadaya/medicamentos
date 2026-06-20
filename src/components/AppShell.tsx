// AppShell: top bar with multi-paciente selector, navigation, main content area, status footer.

import { NavLink, Outlet } from 'react-router-dom';
import { usePacientes } from '../features/pacientes/hooks';
import { useActivePaciente } from '../stores/activePaciente';
import { OutboxIndicator } from '../features/tomas/OutboxIndicator';
import { NotificationPermissionPrompt } from '../features/notifications/NotificationPermissionPrompt';

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
  { to: '/admin/interactions', label: 'Interacciones' },
  { to: '/settings', label: 'Ajustes' },
];

export function AppShell() {
  const { data: pacientes } = usePacientes();
  const { activePacienteId, setActivePaciente } = useActivePaciente();

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

        <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
          <OutboxIndicator />
        </nav>
      </header>

      {/* Active paciente banner */}
      {activePaciente && (
        <div style={styles.banner}>
          Paciente activo: <strong>{activePaciente.name}</strong>
          <span style={styles.tz}>({activePaciente.timezone_id})</span>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, padding: '1rem' }}>
        <Outlet />
      </main>

      {/* Status footer */}
      <footer
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
