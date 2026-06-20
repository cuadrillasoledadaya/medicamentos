// SettingsPage — theme toggle, account info, logout, and notification settings link.

import { useTheme } from '../hooks/useTheme';
import { useCurrentUser, useSignOut } from '../features/auth/hooks';

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { data: user } = useCurrentUser();
  const signOut = useSignOut();

  return (
    <div>
      <h1 style={styles.title}>Ajustes</h1>

      {/* Theme toggle */}
      <section style={styles.section}>
        <h2 style={styles.subtitle}>Apariencia</h2>
        <div style={styles.row}>
          <span>Tema</span>
          <button onClick={toggle} style={styles.themeBtn}>
            {theme === 'light' ? '🌙 Modo oscuro' : '☀️ Modo claro'}
          </button>
        </div>
      </section>

      {/* Locale (v1: Spanish only) */}
      <section style={styles.section}>
        <h2 style={styles.subtitle}>Idioma</h2>
        <p style={{ color: '#888', fontSize: '0.875rem' }}>
          Español (v1). Soporte para más idiomas próximamente.
        </p>
      </section>

      {/* Account info */}
      <section style={styles.section}>
        <h2 style={styles.subtitle}>Cuenta</h2>
        {user ? (
          <div style={styles.row}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.email}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                ID: {user.id.slice(0, 8)}...
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: '0.875rem' }}>Cargando información de cuenta...</p>
        )}
      </section>

      {/* Logout */}
      <section style={styles.section}>
        <button
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          style={styles.logoutBtn}
        >
          {signOut.isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </section>
    </div>
  );
}

export default SettingsPage;

const styles: Record<string, React.CSSProperties> = {
  title: { margin: 0, fontSize: '1.5rem', marginBottom: '1rem' },
  section: {
    marginBottom: '1.5rem',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '8px',
  },
  subtitle: { margin: '0 0 0.75rem', fontSize: '1.125rem' },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeBtn: {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  logoutBtn: {
    padding: '0.5rem 1.5rem',
    border: 'none',
    borderRadius: '6px',
    background: '#dc2626',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
};
