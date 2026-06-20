// Retention admin — view current retention_days and update per-paciente override.

import { useState } from 'react';
import { useRetentionPolicies, useUpsertRetentionOverride } from './hooks';

interface RetentionSettingsProps {
  pacienteId: string;
}

export function RetentionSettings({ pacienteId }: RetentionSettingsProps) {
  const { data, isLoading } = useRetentionPolicies(pacienteId);
  const upsertMutation = useUpsertRetentionOverride();
  const [overrideDays, setOverrideDays] = useState<string>('');
  const [editing, setEditing] = useState(false);

  if (isLoading) return <p style={styles.loading}>Cargando política de retención...</p>;

  const globalDays = data?.global?.retention_days ?? 730;
  const currentEffective = data?.perPaciente?.retention_days ?? globalDays;

  const handleSave = () => {
    const days = parseInt(overrideDays, 10);
    if (isNaN(days) || days < 1) return;
    upsertMutation.mutate({ pacienteId, retentionDays: days }, {
      onSuccess: () => setEditing(false),
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Política de retención de datos</h2>

      {/* Global default */}
      <div style={styles.card}>
        <div style={styles.label}>Predeterminado global</div>
        <div style={styles.value}>{globalDays} días ({Math.round(globalDays / 365 * 10) / 10} años)</div>
        <p style={styles.hint}>
          Las tomas más antiguas que este período se archivan automáticamente en el trabajo nocturno.
          Las temporadas cerradas son inmutables y nunca se archivan.
        </p>
      </div>

      {/* Per-paciente override */}
      <div style={styles.card}>
        <div style={styles.label}>
          Override por paciente
          {data?.perPaciente && <span style={styles.activeTag}>Activo</span>}
        </div>

        {editing ? (
          <div style={styles.editRow}>
            <input
              type="number"
              min={1}
              value={overrideDays}
              onChange={(e) => setOverrideDays(e.target.value)}
              placeholder={String(currentEffective)}
              style={styles.input}
            />
            <div style={styles.editActions}>
              <button onClick={handleSave} disabled={upsertMutation.isPending} style={styles.saveBtn}>
                {upsertMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditing(false)} style={styles.cancelBtn}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={styles.currentRow}>
            <div style={styles.value}>
              {data?.perPaciente
                ? `${data.perPaciente.retention_days} días`
                : 'Sin override (usa el predeterminado global)'}
            </div>
            <button onClick={() => { setEditing(true); setOverrideDays(String(currentEffective)); }} style={styles.editBtn}>
              Editar
            </button>
          </div>
        )}

        {upsertMutation.error && (
          <p style={styles.error}>{upsertMutation.error.message}</p>
        )}
      </div>

      {/* Archive job status */}
      <div style={styles.card}>
        <div style={styles.label}>Trabajo de archivado</div>
        <div style={styles.disabled}>⛔ Deshabilitado (v1)</div>
        <p style={styles.hint}>
          El trabajo de archivado nocturno existe como stub pero NO está programado vía cron.
          Se habilitará en una versión futura cuando se configure pg_cron.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem' },
  title: { margin: '0 0 1rem', fontSize: '1.25rem' },
  loading: { color: '#888', textAlign: 'center', padding: '1rem' },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  label: { fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' },
  value: { fontSize: '1.125rem', fontWeight: 600, color: '#111827' },
  hint: { fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0' },
  activeTag: {
    marginLeft: '0.5rem',
    fontSize: '0.6875rem',
    background: '#d1fae5',
    color: '#065f46',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontWeight: 600,
  },
  editRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' },
  input: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', width: '120px' },
  editActions: { display: 'flex', gap: '0.5rem' },
  saveBtn: {
    padding: '0.375rem 0.75rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  cancelBtn: {
    padding: '0.375rem 0.75rem',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  currentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' },
  editBtn: {
    padding: '0.375rem 0.75rem',
    background: '#e0f2fe',
    color: '#0369a1',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  error: { fontSize: '0.8125rem', color: '#dc2626', margin: '0.5rem 0 0' },
  disabled: { fontSize: '1rem', color: '#9ca3af' },
};
