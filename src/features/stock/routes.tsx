// Stock management route — shows low-stock medications and adjustment forms.

import { useActivePaciente } from '../../stores/activePaciente';
import { useMedications } from '../medications/hooks';
import { StockAlertBanner } from './StockAlertBanner';
import { StockAdjustForm } from './StockAdjustForm';
import { useState } from 'react';

export default function StockPage() {
  const { activePacienteId } = useActivePaciente();
  const { data: medications } = useMedications(activePacienteId ?? '');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  if (!activePacienteId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Selecciona un paciente para gestionar el stock.
      </div>
    );
  }

  const activeMeds = medications?.filter((m) => m.active) ?? [];

  return (
    <div>
      <h1 style={styles.title}>Gestión de stock</h1>

      {/* Low-stock banner */}
      <StockAlertBanner pacienteId={activePacienteId} />

      {/* All active medications with stock info */}
      <div style={styles.section}>
        <h2 style={styles.subtitle}>Medicamentos activos</h2>
        {activeMeds.length > 0 ? (
          <ul style={styles.list}>
            {activeMeds.map((med) => (
              <li key={med.id} style={styles.listItem}>
                <div style={styles.medInfo}>
                  <span style={styles.medName}>{med.name}</span>
                  <span style={styles.stock}>
                    Stock: <strong>{med.stock_estimate}</strong> / {med.low_stock_threshold}
                    {med.stock_estimate <= med.low_stock_threshold && (
                      <span style={styles.lowBadge}>⚠️ Bajo</span>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => setAdjustingId(adjustingId === med.id ? null : med.id)}
                  style={styles.adjustBtn}
                >
                  {adjustingId === med.id ? 'Cerrar' : 'Ajustar'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#888' }}>No hay medicamentos activos.</p>
        )}
      </div>

      {/* Adjustment form */}
      {adjustingId && (
        <div style={styles.section}>
          {(() => {
            const med = activeMeds.find((m) => m.id === adjustingId);
            if (!med) return null;
            return (
              <StockAdjustForm
                medicationId={med.id}
                medicationName={med.name}
                currentStock={med.stock_estimate}
                onSuccess={() => setAdjustingId(null)}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { margin: '0 0 1rem', fontSize: '1.5rem' },
  section: { marginBottom: '1.5rem' },
  subtitle: { margin: '0 0 0.75rem', fontSize: '1.125rem' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  medInfo: { display: 'flex', flexDirection: 'column', gap: '0.125rem' },
  medName: { fontWeight: 600, fontSize: '0.875rem' },
  stock: { fontSize: '0.8125rem', color: '#6b7280' },
  lowBadge: { marginLeft: '0.5rem', color: '#dc2626', fontWeight: 700 },
  adjustBtn: {
    padding: '0.375rem 0.75rem',
    background: '#e0f2fe',
    color: '#0369a1',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
};
