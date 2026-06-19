// MedicationList — list view with photo thumbnail, name, dose, stock indicator.

import { Link } from 'react-router-dom';
import type { Medication } from '../../lib/database.types';

interface MedicationListProps {
  medications: Medication[];
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function MedicationList({ medications, onArchive, onDelete }: MedicationListProps) {
  if (medications.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No hay medicamentos registrados.</p>;
  }

  const handleDelete = (id: string, name: string) => {
    if (onDelete && window.confirm(`¿Eliminar "${name}"? Esta acción borra también sus horarios y tomas. No se puede deshacer.`)) {
      onDelete(id);
    }
  };

  return (
    <ul style={styles.list}>
      {medications.map((med) => (
        <li key={med.id} style={{ ...styles.item, opacity: med.active ? 1 : 0.5 }}>
          <Link
            to={`/medications/${med.id}`}
            style={styles.link}
            aria-label={`Ver detalle de ${med.name}`}
          >
            <div style={styles.info}>
              <span style={styles.name}>{med.name}</span>
              <span style={styles.dose}>
                {med.dose_value} {med.dose_unit === 'other' ? med.dose_unit_other : med.dose_unit}
              </span>
              <StockIndicator current={med.stock_estimate} threshold={med.low_stock_threshold} />
            </div>
          </Link>
          <div style={styles.actions}>
            {med.active && onArchive && (
              <button onClick={() => onArchive(med.id)} style={styles.archiveBtn}>
                Desactivar
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => handleDelete(med.id, med.name)}
                style={styles.deleteBtn}
                aria-label={`Eliminar ${med.name}`}
              >
                Eliminar
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function StockIndicator({ current, threshold }: { current: number; threshold: number }) {
  const isLow = current <= threshold;
  return (
    <span style={{
      ...styles.stock,
      color: isLow ? '#dc2626' : '#16a34a',
      fontWeight: isLow ? 700 : 400,
    }}>
      Stock: {current}
      {isLow && ' ⚠️'}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  info: { display: 'flex', flexDirection: 'column', gap: '0.125rem' },
  link: {
    flex: 1,
    textDecoration: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '4px',
  },
  name: { fontWeight: 600, fontSize: '1rem' },
  dose: { fontSize: '0.875rem', color: '#6b7280' },
  stock: { fontSize: '0.75rem' },
  archiveBtn: {
    padding: '0.25rem 0.5rem',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  deleteBtn: {
    padding: '0.25rem 0.5rem',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  actions: {
    display: 'flex',
    gap: '0.25rem',
    alignItems: 'center',
  },
};
