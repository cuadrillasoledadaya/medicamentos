// AppShell: top bar, navigation, main content area, status footer.

import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/medications', label: 'Medicamentos' },
  { to: '/calendar', label: 'Calendario' },
  { to: '/settings', label: 'Ajustes' },
];

export function AppShell() {
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
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Medicamentos</h1>
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
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
      </header>

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
    </div>
  );
}
