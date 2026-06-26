// DeviceList — manages the user's active push subscriptions.
//
// Lists all active subscriptions with device name, last-seen time,
// and a Revoke button with confirm-before-delete UX.

import { useState } from 'react';
import { usePushSubscriptions, useRevokePushSubscription } from './hooks';
import { parseDeviceName } from './pushSubscription';

/**
 * Format a relative time string in Spanish.
 */
function relativeTime(dateString: string | null): string {
  if (!dateString) return 'Nunca';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHr < 24) return `hace ${diffHr} h`;
  if (diffDay < 7) return `hace ${diffDay} día${diffDay > 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-AR');
}

interface ConfirmState {
  isOpen: boolean;
  subscriptionId: string | null;
  deviceName: string | null;
}

export function DeviceList() {
  const { data: subscriptions, isLoading, isError } = usePushSubscriptions();
  const revokeMutation = useRevokePushSubscription();
  const [confirm, setConfirm] = useState<ConfirmState>({
    isOpen: false,
    subscriptionId: null,
    deviceName: null,
  });

  if (isLoading) {
    return (
      <div style={styles.container} role="status" aria-label="Cargando dispositivos">
        <p style={styles.loadingText}>Cargando dispositivos...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={styles.container} role="alert">
        <p style={styles.errorText}>
          No pudimos cargar tus dispositivos. Intentá de nuevo.
        </p>
      </div>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.emptyText}>
          No tenés dispositivos suscriptos. Activá las notificaciones para empezar.
        </p>
      </div>
    );
  }

  const handleRevokeClick = (id: string, deviceName: string | null) => {
    setConfirm({ isOpen: true, subscriptionId: id, deviceName });
  };

  const handleConfirmRevoke = async () => {
    if (confirm.subscriptionId) {
      await revokeMutation.mutateAsync(confirm.subscriptionId);
    }
    setConfirm({ isOpen: false, subscriptionId: null, deviceName: null });
  };

  const handleCancelRevoke = () => {
    setConfirm({ isOpen: false, subscriptionId: null, deviceName: null });
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Dispositivos conectados</h4>
      <ul style={styles.list} aria-label="Lista de dispositivos con notificaciones push">
        {subscriptions.map((sub) => (
          <li key={sub.id} style={styles.item}>
            <div style={styles.itemInfo}>
              <span style={styles.deviceName}>
                {sub.device_name || parseDeviceName(navigator.userAgent)}
              </span>
              <span style={styles.lastSeen}>
                Última vez: {relativeTime(sub.last_seen_at)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleRevokeClick(sub.id, sub.device_name)}
              disabled={revokeMutation.isPending}
              style={styles.revokeBtn}
              aria-label={`Eliminar dispositivo ${sub.device_name || 'desconocido'}`}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      {/* Confirm dialog */}
      {confirm.isOpen && (
        <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="Confirmar eliminación">
          <div style={styles.dialog}>
            <p style={styles.dialogText}>
              ¿Eliminar este dispositivo{confirm.deviceName ? ` (${confirm.deviceName})` : ''}?
              No recibirá más notificaciones push.
            </p>
            <div style={styles.dialogActions}>
              <button
                type="button"
                onClick={handleCancelRevoke}
                style={styles.cancelBtn}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={revokeMutation.isPending}
                style={styles.confirmBtn}
              >
                {revokeMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  title: {
    margin: '0 0 0.75rem',
    fontSize: '1rem',
    color: '#374151',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    background: '#fff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },
  deviceName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#111827',
  },
  lastSeen: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  revokeBtn: {
    padding: '0.375rem 0.75rem',
    border: '1px solid #ef4444',
    borderRadius: '4px',
    background: '#fff',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '0.875rem',
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '0.875rem',
    textAlign: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '0.875rem',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  dialogText: {
    margin: '0 0 1rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  dialogActions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '0.375rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  confirmBtn: {
    padding: '0.375rem 0.75rem',
    border: 'none',
    borderRadius: '4px',
    background: '#ef4444',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
};
