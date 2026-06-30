// TodayList — list of today's tomas for the active paciente.

import { useRef, useEffect } from 'react';
import { useTodayTomas } from './hooks';
import { IntakeLogger } from './IntakeLogger';
import { statusLabel, statusColor } from './intake';

interface TodayListProps {
  pacienteId: string;
  highlightTomaId?: string;
}

export function TodayList({ pacienteId, highlightTomaId }: TodayListProps) {
  const { data: tomas, isLoading, refetch } = useTodayTomas(pacienteId);
  const highlightedRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [highlightTomaId]);

  if (isLoading) return <p style={{ color: '#888' }}>Cargando tomas de hoy...</p>;

  if (!tomas || tomas.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ color: '#888' }}>No hay tomas programadas para hoy.</p>
        <p style={{ color: '#888', fontSize: '0.75rem' }}>
          El generador de horarios (PR 4) creará las tomas automáticamente.
        </p>
      </div>
    );
  }

  return (
    <ul style={styles.list}>
      {tomas.map((toma) => {
        const isHighlighted = highlightTomaId === toma.id;
        const itemStyle: React.CSSProperties = isHighlighted
          ? { ...styles.item, ...highlightedStyle }
          : styles.item;

        return (
          <li
            key={toma.id}
            ref={isHighlighted ? highlightedRef : null}
            style={itemStyle}
          >
            <div style={styles.info}>
              <span style={styles.time}>
                {new Date(toma.scheduled_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span
                style={{
                  ...styles.dot,
                  background: statusColor(toma.status),
                }}
              />
              <span style={styles.status}>{statusLabel(toma.status)}</span>
            </div>
            <IntakeLogger toma={toma} onAction={() => refetch()} />
          </li>
        );
      })}
    </ul>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    padding: '0.75rem 0',
    borderBottom: '1px solid #e5e7eb',
  },
  info: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' },
  time: { fontWeight: 700, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  status: { fontSize: '0.875rem', color: '#6b7280' },
  empty: { textAlign: 'center', padding: '2rem 0' },
};

const highlightedStyle: React.CSSProperties = {
  borderLeft: '4px solid #facc15',
  background: '#fefce8',
  borderRadius: '4px',
  paddingLeft: '0.5rem',
};
