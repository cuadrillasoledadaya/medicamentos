// MedicationList — list view with photo thumbnail, name, dose, stock indicator.

import type { Medication } from '../../lib/database.types';

interface MedicationListProps {
  medications: Medication[];
  onArchive?: (id: string) => void;
}

export function MedicationList({ medications, onArchive }: MedicationListProps) {
  if (medications.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No hay medicamentos registrados.</p>;
  }

  return (
    <ul style={styles.list}>
      {medications.map((med) => (
        <li key={med.id} style={{ ...styles.item, opacity: med.active ? 1 : 0.5 }}>
          <div style={styles.info}>
            <span style={styles.name}>{med.name}</span>
            <span style={styles.dose}>
              {med.dose_value} {med.dose_unit === 'other' ? med.dose_unit_other : med.dose_unit}
            </span>
            <StockIndicator current={med.stock_estimate} threshold={med.low_stock_threshold} />
          </div>
          {med.active && onArchive && (
            <button onClick={() => onArchive(med.id)} style={styles.archiveBtn}>
              Desactivar
            </button>
          )}
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
};
