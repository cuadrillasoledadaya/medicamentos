// Trip shift form — create ±N hour shift for a date range.

import { useState } from 'react';
import { useCreateTripAdjustment, useTripAdjustments } from './hooks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TripShiftFormProps {
  pacienteId: string;
}

export function TripShiftForm({ pacienteId }: TripShiftFormProps) {
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [shiftHours, setShiftHours] = useState(0);
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);

  const createMutation = useCreateTripAdjustment();
  const { data: adjustments, isLoading } = useTripAdjustments(pacienteId);

  const handleSubmit = () => {
    if (!startsAt || !endsAt || shiftHours === 0) return;
    createMutation.mutate({
      paciente_id: pacienteId,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      shift_hours: shiftHours,
      reason: reason || null,
    }, {
      onSuccess: () => {
        setStartsAt('');
        setEndsAt('');
        setShiftHours(0);
        setReason('');
        setShowForm(false);
      },
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Ajustes de viaje</h3>
        <button onClick={() => setShowForm(!showForm)} style={styles.toggleBtn}>
          {showForm ? 'Cerrar' : '+ Nuevo ajuste'}
        </button>
      </div>

      {showForm && (
        <div style={styles.form}>
          <div style={styles.dateRow}>
            <div style={styles.field}>
              <label style={styles.label}>Desde</label>
              <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Hasta</label>
              <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={styles.input} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Desfase horario (horas)</label>
            <input
              type="number"
              step={1}
              value={shiftHours}
              onChange={(e) => setShiftHours(parseInt(e.target.value, 10) || 0)}
              style={styles.input}
            />
            <p style={styles.hint}>Positivo = adelantar, Negativo = retrasar</p>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Motivo (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: viaje a Europa..."
              style={styles.input}
            />
          </div>

          <button onClick={handleSubmit} disabled={createMutation.isPending} style={styles.submitBtn}>
            {createMutation.isPending ? 'Guardando...' : 'Guardar ajuste de viaje'}
          </button>
        </div>
      )}

      {/* Existing adjustments */}
      {isLoading && <p style={styles.loading}>Cargando ajustes...</p>}
      {adjustments && adjustments.length > 0 && (
        <ul style={styles.list}>
          {adjustments.map((adj: any) => (
            <li key={adj.id} style={styles.item}>
              <span>
                {format(new Date(adj.starts_at), 'dd MMM', { locale: es })}
                {' → '}
                {format(new Date(adj.ends_at), 'dd MMM yyyy', { locale: es })}
              </span>
              <span style={adj.shift_hours > 0 ? styles.positive : styles.negative}>
                {adj.shift_hours > 0 ? '+' : ''}{adj.shift_hours}h
              </span>
              {adj.reason && <span style={styles.reason}>{adj.reason}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '1rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  title: { margin: 0, fontSize: '1rem' },
  toggleBtn: {
    padding: '0.375rem 0.75rem',
    background: '#e0f2fe',
    color: '#0369a1',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px' },
  dateRow: { display: 'flex', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { fontSize: '0.8125rem', fontWeight: 600, color: '#374151' },
  input: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' },
  hint: { fontSize: '0.6875rem', color: '#9ca3af', margin: 0 },
  submitBtn: {
    padding: '0.5rem 1rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    alignSelf: 'flex-start',
  },
  loading: { color: '#888', textAlign: 'center', padding: '0.5rem' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem' },
  positive: { color: '#16a34a', fontWeight: 600 },
  negative: { color: '#dc2626', fontWeight: 600 },
  reason: { color: '#9ca3af', fontSize: '0.75rem' },
};
