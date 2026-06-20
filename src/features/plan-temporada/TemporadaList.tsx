// TemporadaList — list of temporadas with state and action buttons.
// Added reopen button for closed temporadas > 90 days old (T-024).

import { useState } from 'react';
import type { Temporada } from '../../lib/database.types';
import { useCloseTemporada } from './hooks';
import { ReopenModal } from './ReopenModal';
import { ReopenAuditLog } from './ReopenAuditLog';

interface TemporadaListProps {
  temporadas: Temporada[];
}

export function TemporadaList({ temporadas }: TemporadaListProps) {
  const closeMutation = useCloseTemporada();
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [showAuditId, setShowAuditId] = useState<string | null>(null);

  const reopeningTemporada = temporadas.find((t) => t.id === reopeningId);

  if (temporadas.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>No hay temporadas registradas.</p>;
  }

  return (
    <>
      <ul style={styles.list}>
        {temporadas.map((t) => {
          const isOpen = t.closed_at === null;
          const isClosed = !isOpen;
          const isEligibleForReopen = isClosed && t.closed_at
            ? new Date(t.closed_at) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            : false;

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
              <div style={styles.actions}>
                {isOpen && (
                  <button
                    onClick={() => closeMutation.mutate(t.id)}
                    style={styles.closeBtn}
                    disabled={closeMutation.isPending}
                  >
                    Cerrar
                  </button>
                )}
                {isEligibleForReopen && (
                  <button
                    onClick={() => setReopeningId(t.id)}
                    style={styles.reopenBtn}
                  >
                    Reabrir con razón
                  </button>
                )}
                {isClosed && (
                  <button
                    onClick={() => setShowAuditId(showAuditId === t.id ? null : t.id)}
                    style={styles.auditBtn}
                  >
                    {showAuditId === t.id ? 'Ocultar auditoría' : 'Ver auditoría'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Reopen modal */}
      {reopeningTemporada && (
        <ReopenModal
          temporadaId={reopeningTemporada.id}
          temporadaName={reopeningTemporada.name}
          onClose={() => setReopeningId(null)}
          onSuccess={() => setReopeningId(null)}
        />
      )}

      {/* Audit log */}
      {showAuditId && (
        <div style={{ marginTop: '1rem' }}>
          <ReopenAuditLog temporadaId={showAuditId} />
        </div>
      )}
    </>
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
  actions: { display: 'flex', gap: '0.5rem' },
  closeBtn: {
    padding: '0.25rem 0.5rem',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  reopenBtn: {
    padding: '0.25rem 0.5rem',
    background: '#fef3c7',
    color: '#92400e',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  auditBtn: {
    padding: '0.25rem 0.5rem',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
};
