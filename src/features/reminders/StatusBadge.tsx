// StatusBadge — notification reliability indicator for the dashboard.
// Green: SW notifications likely work. Yellow: iOS PWA (in-app only). Red: permission denied.

import { useEffect, useState } from 'react';
import { getNotificationReliability } from './utils';

interface Props {
  className?: string;
}

export function StatusBadge({ className }: Props) {
  const [status, setStatus] = useState<'green' | 'yellow' | 'red'>(getNotificationReliability());

  useEffect(() => {
    // Re-check on mount in case permission changed
    setStatus(getNotificationReliability());

    // Listen for permission changes
    const checkInterval = setInterval(() => {
      setStatus(getNotificationReliability());
    }, 5000);

    return () => clearInterval(checkInterval);
  }, []);

  const labels: Record<string, string> = {
    green: 'Notificaciones activas',
    yellow: 'iOS — solo dentro de la app',
    red: 'Permiso denegado',
  };

  const colors: Record<string, string> = {
    green: '#16a34a',
    yellow: '#f59e0b',
    red: '#dc2626',
  };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        background: `${colors[status]}15`,
        color: colors[status],
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: colors[status],
          display: 'inline-block',
        }}
      />
      {labels[status]}
    </span>
  );
}
