// NotificationPermissionPrompt — shown on first visit to request notification permission.

import { useState, useEffect } from 'react';
import {
  requestNotificationPermission,
  getNotificationPermission,
  isIOS,
} from './scheduler';

const STORAGE_KEY = 'meds-notification-prompt-dismissed';

interface Props {
  onDismiss?: () => void;
}

export function NotificationPermissionPrompt({ onDismiss }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed, permission granted, or permission denied
    if (localStorage.getItem(STORAGE_KEY)) return;

    const current = getNotificationPermission();

    if (current === 'default') {
      setShow(true);
    }
  }, []);

  const handleAllow = async () => {
    await requestNotificationPermission();
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onDismiss?.();
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onDismiss?.();
  };

  if (!show) return null;

  const iosWarning = isIOS();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        maxWidth: '400px',
        margin: '0 auto',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '1rem',
        zIndex: 1000,
      }}
    >
      <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>
        Activar recordatorios de medicamentos
      </h4>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
        Te enviaremos notificaciones cuando sea hora de tomar cada medicamento.
        {iosWarning && (
          <span style={{ display: 'block', marginTop: '0.25rem', color: '#f59e0b' }}>
            ⚠️ En iOS, las notificaciones pueden no funcionar en segundo plano.
            Verás los recordatorios dentro de la app.
          </span>
        )}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDismiss}
          style={{
            padding: '0.375rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Ahora no
        </button>
        <button
          onClick={handleAllow}
          style={{
            padding: '0.375rem 0.75rem',
            border: 'none',
            borderRadius: '4px',
            background: '#0ea5e9',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Activar
        </button>
      </div>
    </div>
  );
}
