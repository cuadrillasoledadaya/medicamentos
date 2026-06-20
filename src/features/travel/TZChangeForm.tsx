// TZ change form — update paciente's timezone_id.

import { useState } from 'react';
import { useUpdatePacienteTimezone } from './hooks';
import { COMMON_TIMEZONES } from './api';

interface TZChangeFormProps {
  pacienteId: string;
  currentTimezone: string;
}

export function TZChangeForm({ pacienteId, currentTimezone }: TZChangeFormProps) {
  const [newTimezone, setNewTimezone] = useState(currentTimezone);
  const mutation = useUpdatePacienteTimezone();

  const handleSubmit = () => {
    if (newTimezone === currentTimezone) return;
    mutation.mutate({ pacienteId, timezoneId: newTimezone });
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Cambiar zona horaria</h3>
      <p style={styles.hint}>
        Zona actual: <strong>{currentTimezone}</strong>
      </p>
      <p style={styles.warning}>
        ⚠️ Al cambiar la zona horaria, las tomas futuras se recalcularán en la nueva zona.
        Las tomas históricas mantienen su zona original.
      </p>

      <select
        value={newTimezone}
        onChange={(e) => setNewTimezone(e.target.value)}
        style={styles.select}
      >
        {COMMON_TIMEZONES.map((tz) => (
          <option key={tz} value={tz}>{tz}</option>
        ))}
      </select>

      <button
        onClick={handleSubmit}
        disabled={mutation.isPending || newTimezone === currentTimezone}
        style={styles.btn}
      >
        {mutation.isPending ? 'Actualizando...' : 'Actualizar zona horaria'}
      </button>

      {mutation.error && <p style={styles.error}>{mutation.error.message}</p>}
      {mutation.data && <p style={styles.success}>Zona horaria actualizada correctamente.</p>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' },
  title: { margin: '0 0 0.5rem', fontSize: '1rem' },
  hint: { fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 0.25rem' },
  warning: { fontSize: '0.75rem', color: '#92400e', background: '#fef3c7', padding: '0.5rem', borderRadius: '4px', margin: '0 0 0.75rem' },
  select: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', width: '100%', marginBottom: '0.75rem' },
  btn: {
    padding: '0.5rem 1rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  error: { fontSize: '0.8125rem', color: '#dc2626', margin: '0.5rem 0 0' },
  success: { fontSize: '0.8125rem', color: '#16a34a', margin: '0.5rem 0 0' },
};
