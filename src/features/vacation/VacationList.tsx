// Vacation list — shows all vacations for the active paciente with cancel button.

import { useVacations, useCancelVacation, useDeleteVacation } from './hooks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VacationListProps {
  pacienteId: string;
}

export function VacationList({ pacienteId }: VacationListProps) {
  const { data: vacations, isLoading } = useVacations(pacienteId);
  const cancelMutation = useCancelVacation();
  const deleteMutation = useDeleteVacation();

  if (isLoading) return <p style={styles.loading}>Cargando vacaciones...</p>;

  if (!vacations || vacations.length === 0) {
    return <p style={styles.empty}>No hay vacaciones registradas.</p>;
  }

  const now = new Date();

  return (
    <ul style={styles.list}>
      {vacations.map((v) => {
        const isActive = now >= new Date(v.starts_at) && now <= new Date(v.ends_at);
        const isGlobal = !v.medication_id;

        return (
          <li key={v.id} style={{
            ...styles.item,
            borderLeft: isActive ? '4px solid #f59e0b' : '4px solid #e5e7eb',
          }}>
            <div style={styles.info}>
              <div style={styles.header}>
                <span style={styles.scope}>
                  {isGlobal ? '🌍 GLOBAL' : `💊 ${(v as any).medications?.name ?? 'Medicamento'}`}
                </span>
                {isActive && <span style={styles.activeBadge}>Activa</span>}
                {!isActive && <span style={styles.inactiveBadge}>Finalizada</span>}
              </div>
              <div style={styles.dates}>
                {format(new Date(v.starts_at), 'dd MMM yyyy', { locale: es })}
                {' → '}
                {format(new Date(v.ends_at), 'dd MMM yyyy', { locale: es })}
              </div>
              {v.reason && <p style={styles.reason}>{v.reason}</p>}
            </div>
            <div style={styles.actions}>
              {isActive && (
                <button
                  onClick={() => cancelMutation.mutate(v.id)}
                  disabled={cancelMutation.isPending}
                  style={styles.cancelBtn}
                >
                  {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                </button>
              )}
              {!isActive && (
                <button
                  onClick={() => deleteMutation.mutate(v.id)}
                  disabled={deleteMutation.isPending}
                  style={styles.deleteBtn}
                >
                  {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { color: '#888', textAlign: 'center', padding: '1rem' },
  empty: { color: '#888', textAlign: 'center', padding: '1rem' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  info: { flex: 1 },
  header: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' },
  scope: { fontSize: '0.875rem', fontWeight: 600 },
  activeBadge: {
    fontSize: '0.6875rem',
    background: '#fef3c7',
    color: '#92400e',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontWeight: 600,
  },
  inactiveBadge: {
    fontSize: '0.6875rem',
    background: '#f3f4f6',
    color: '#6b7280',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
  },
  dates: { fontSize: '0.8125rem', color: '#6b7280' },
  reason: { fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0' },
  actions: { display: 'flex', gap: '0.5rem' },
  cancelBtn: {
    padding: '0.375rem 0.75rem',
    background: '#fef3c7',
    color: '#92400e',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  deleteBtn: {
    padding: '0.375rem 0.75rem',
    background: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
};
