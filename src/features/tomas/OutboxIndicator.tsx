// OutboxIndicator — badge showing pending outbox count.

import { useEffect, useState } from 'react';
import { getPendingOutboxCount } from './outbox';

export function OutboxIndicator() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = async () => {
      const c = await getPendingOutboxCount();
      setCount(c);
    };
    update();

    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <span
      style={styles.badge}
      title={`${count} toma(s) en espera de sincronización`}
    >
      📤 {count}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    background: '#f59e0b',
    color: '#fff',
    padding: '0.125rem 0.375rem',
    borderRadius: '9999px',
    fontSize: '0.625rem',
    fontWeight: 700,
  },
};
