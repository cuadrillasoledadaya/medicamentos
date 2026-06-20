// Vacation create form with scope picker (GLOBAL or PER_MEDICATION).

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vacationSchema, type VacationFormData } from './validation';
import { useCreateVacation } from './hooks';
import { useMedications } from '../medications/hooks';

interface VacationFormProps {
  pacienteId: string;
  onSuccess: () => void;
}

export function VacationForm({ pacienteId, onSuccess }: VacationFormProps) {
  const [scope, setScope] = useState<'global' | 'per_medication'>('global');
  const { data: medications } = useMedications(pacienteId);
  const createMutation = useCreateVacation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<VacationFormData>({
    resolver: zodResolver(vacationSchema) as any,
    defaultValues: {
      scope: 'global',
      medication_id: null,
      starts_at: '',
      ends_at: '',
      reason: '',
    },
  });

  const selectedScope = watch('scope');
  void selectedScope; // Used for scope state tracking

  const onSubmit = (data: VacationFormData) => {
    createMutation.mutate(
      {
        paciente_id: pacienteId,
        medication_id: data.scope === 'global' ? null : data.medication_id,
        starts_at: new Date(data.starts_at).toISOString(),
        ends_at: new Date(data.ends_at).toISOString(),
        reason: data.reason || null,
      },
      {
        onSuccess: ({ error }) => {
          if (!error) {
            reset();
            onSuccess();
          }
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
      {/* Scope picker */}
      <div style={styles.field}>
        <label style={styles.label}>Alcance</label>
        <div style={styles.radioGroup}>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              value="global"
              checked={scope === 'global'}
              onChange={() => { setScope('global'); reset({ ...watch(), scope: 'global', medication_id: null }); }}
            />
            Global (todos los medicamentos)
          </label>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              value="per_medication"
              checked={scope === 'per_medication'}
              onChange={() => setScope('per_medication')}
            />
            Por medicamento
          </label>
        </div>
      </div>

      {/* Medication selector (only for per_medication) */}
      {scope === 'per_medication' && (
        <div style={styles.field}>
          <label style={styles.label}>Medicamento</label>
          <select
            {...register('medication_id')}
            style={styles.select}
          >
            <option value="">Seleccionar...</option>
            {medications?.filter((m) => m.active).map((med) => (
              <option key={med.id} value={med.id}>{med.name}</option>
            ))}
          </select>
          {errors.medication_id && <span style={styles.error}>{errors.medication_id.message}</span>}
        </div>
      )}

      {/* Date range */}
      <div style={styles.dateRow}>
        <div style={styles.field}>
          <label style={styles.label}>Fecha de inicio</label>
          <input
            type="date"
            {...register('starts_at')}
            style={styles.input}
          />
          {errors.starts_at && <span style={styles.error}>{errors.starts_at.message}</span>}
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Fecha de fin</label>
          <input
            type="date"
            {...register('ends_at')}
            style={styles.input}
          />
          {errors.ends_at && <span style={styles.error}>{errors.ends_at.message}</span>}
        </div>
      </div>

      {/* Reason (optional) */}
      <div style={styles.field}>
        <label style={styles.label}>Motivo (opcional)</label>
        <textarea
          {...register('reason')}
          rows={2}
          style={styles.textarea}
          placeholder="Ej: viaje, cirugía, cambio de tratamiento..."
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={createMutation.isPending}
        style={styles.submitBtn}
      >
        {createMutation.isPending ? 'Creando...' : 'Crear vacaciones'}
      </button>

      {createMutation.error && (
        <p style={styles.submitError}>{createMutation.error.message}</p>
      )}
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { fontSize: '0.8125rem', fontWeight: 600, color: '#374151' },
  radioGroup: { display: 'flex', gap: '1rem' },
  radioLabel: { fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' },
  select: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' },
  input: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' },
  textarea: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', resize: 'vertical' },
  dateRow: { display: 'flex', gap: '1rem' },
  error: { fontSize: '0.75rem', color: '#dc2626' },
  submitBtn: {
    padding: '0.625rem 1rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  submitError: { fontSize: '0.8125rem', color: '#dc2626', margin: 0 },
};
