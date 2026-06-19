// TemporadaList — list of temporadas with state and action buttons.

import type { Temporada } from '../../lib/database.types';
import { useCloseTemporada } from './hooks';

interface TemporadaListProps {
  temporadas: Temporada[];
}

export function TemporadaList({ temporadas }: TemporadaListProps) {
  const closeMutation = useCloseTemporada();

  if (temporadas.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>No hay temporadas registradas.</p>;
  }

  return (
    <ul style={styles.list}>
      {temporadas.map((t) => {
        const isOpen = t.closed_at === null;
        return (
          <li key={t.id} style={styles.item}>
            <div style={styles.info}>
              <span style={styles.name}>{t.name}</span>
              <span style={styles.dates}>
                {t.start_date} → {t.end_date}
              </span>
              <span style={{
                ...styles.badge,
                background: isOpen ? '#dcfce7' : '#fee2e2',
                color: isOpen ? '#16a34a' : '#dc2626',
              }}>
                {isOpen ? 'ABIERTA' : 'CERRADA'}
              </span>
            </div>
            {isOpen && (
              <button
                onClick={() => closeMutation.mutate(t.id)}
                style={styles.closeBtn}
                disabled={closeMutation.isPending}
              >
                Cerrar temporada
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e5e7eb',
  },
  info: { display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem' },
  name: { fontWeight: 600 },
  dates: { color: '#6b7280' },
  badge: { padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 700 },
  closeBtn: {
    padding: '0.25rem 0.5rem',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
};
