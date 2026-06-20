// StockAlertBanner — dashboard banner listing low-stock medications.

import { useLowStockMedications } from './hooks';

interface StockAlertBannerProps {
  pacienteId: string;
}

export function StockAlertBanner({ pacienteId }: StockAlertBannerProps) {
  const { data: lowStock, isLoading } = useLowStockMedications(pacienteId);

  if (isLoading) return null;
  if (!lowStock || lowStock.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>📦</span>
        <span style={styles.title}>
          Stock bajo ({lowStock.length} {lowStock.length === 1 ? 'medicamento' : 'medicamentos'})
        </span>
      </div>
      <ul style={styles.list}>
        {lowStock.map((med) => (
          <li key={med.id} style={styles.item}>
            <span style={styles.medName}>{med.name}</span>
            <span style={styles.stockInfo}>
              Stock: <strong style={styles.lowCount}>{med.stock_estimate}</strong>
              {' '}/ {med.low_stock_threshold}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '1rem',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #fbbf24',
    background: '#fffbeb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #fde68a',
  },
  icon: { fontSize: '1.125rem' },
  title: { fontWeight: 700, fontSize: '0.875rem', color: '#92400e' },
  list: { listStyle: 'none', padding: '0.5rem 1rem', margin: 0 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.375rem 0',
    borderBottom: '1px solid #fef3c7',
    fontSize: '0.875rem',
  },
  medName: { fontWeight: 600 },
  stockInfo: { color: '#92400e' },
  lowCount: { color: '#dc2626' },
};
