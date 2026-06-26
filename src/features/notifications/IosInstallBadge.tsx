// IosInstallBadge — iOS PWA install reminder.
//
// Shows a warm message in Spanish when the user is on iOS but the PWA
// is not installed as a standalone app. Dismissible; state persists to localStorage.

import { useState, useEffect } from 'react';
import { isIOSStandalone, isIOS } from './scheduler';

const STORAGE_KEY = 'ios-install-badge-dismissed';

export function IosInstallBadge() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) {
      setDismissed(true);
    }
  }, []);

  // Only show on iOS, not in standalone mode, and not previously dismissed
  if (dismissed || !isIOS() || isIOSStandalone()) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <div
      style={styles.badge}
      role="status"
      aria-label="Instrucciones para instalar la app en iPhone"
    >
      <span style={styles.icon}>📱</span>
      <div style={styles.textContainer}>
        <p style={styles.message}>
          Para recibir notificaciones en iPhone, agregá esta app a tu pantalla de inicio:
          tocá el botón compartir <span style={styles.iconInline}>⎋</span>{' '}
          → <strong>"Agregar a pantalla de inicio"</strong>.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        style={styles.dismissBtn}
        aria-label="Cerrar aviso de instalación"
      >
        Entendido
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  icon: {
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  iconInline: {
    fontSize: '0.875rem',
  },
  textContainer: {
    flex: 1,
  },
  message: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#92400e',
    lineHeight: 1.5,
  },
  dismissBtn: {
    padding: '0.25rem 0.5rem',
    border: '1px solid #f59e0b',
    borderRadius: '4px',
    background: 'transparent',
    color: '#92400e',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 500,
    flexShrink: 0,
  },
};
