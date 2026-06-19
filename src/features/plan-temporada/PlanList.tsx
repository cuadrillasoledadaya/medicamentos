// PlanList — list of plans for a paciente.

import type { Plan } from '../../lib/database.types';

interface PlanListProps {
  plans: Plan[];
}

export function PlanList({ plans }: PlanListProps) {
  if (plans.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>No hay planes registrados.</p>;
  }

  return (
    <ul style={styles.list}>
      {plans.map((p) => (
        <li key={p.id} style={styles.item}>
          <span style={styles.badge}>
            {p.is_permanent ? 'Permanente' : 'Temporada'}
          </span>
          {p.notes && <span style={styles.notes}>{p.notes}</span>}
        </li>
      ))}
    </ul>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.875rem',
  },
  badge: {
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 700,
    background: '#e0f2fe',
    color: '#0369a1',
  },
  notes: { color: '#6b7280' },
};
