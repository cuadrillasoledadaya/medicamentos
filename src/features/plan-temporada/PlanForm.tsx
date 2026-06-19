// PlanForm — create a plan (PERMANENT or SEASONAL).

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePlan } from './hooks';
import type { Temporada } from '../../lib/database.types';

const planSchema = z.object({
  type: z.enum(['permanent', 'seasonal']),
  temporada_id: z.string().optional(),
  notes: z.string(),
});

type PlanFormData = z.infer<typeof planSchema>;

interface PlanFormProps {
  pacienteId: string;
  temporadas: Temporada[];
  onSuccess?: () => void;
}

export function PlanForm({ pacienteId, temporadas, onSuccess }: PlanFormProps) {
  const createMutation = useCreatePlan();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: { type: 'permanent', temporada_id: '', notes: '' },
  });

  const selectedType = watch('type');
  const openTemporadas = temporadas.filter((t) => t.closed_at === null);

  const onSubmit = async (data: PlanFormData) => {
    const result = await createMutation.mutateAsync({
      paciente_id: pacienteId,
      is_permanent: data.type === 'permanent',
      temporada_id: data.type === 'seasonal' ? data.temporada_id : null,
      notes: data.notes || null,
    });
    if (!result.error) {
      reset();
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
      <div style={styles.field}>
        <label style={styles.label}>Tipo de plan</label>
        <div style={styles.radioGroup}>
          <label style={styles.radioLabel}>
            <input type="radio" value="permanent" {...register('type')} />
            Plan permanente
          </label>
          <label style={styles.radioLabel}>
            <input type="radio" value="seasonal" {...register('type')} />
            Plan de temporada
          </label>
        </div>
      </div>

      {selectedType === 'seasonal' && (
        <div style={styles.field}>
          <label htmlFor="temporada_id" style={styles.label}>Temporada</label>
          <select id="temporada_id" {...register('temporada_id')} style={styles.input}>
            <option value="">— Seleccionar —</option>
            {openTemporadas.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {errors.temporada_id && <span style={styles.error}>{errors.temporada_id.message}</span>}
        </div>
      )}

      <div style={styles.field}>
        <label htmlFor="notes" style={styles.label}>Notas</label>
        <input id="notes" type="text" {...register('notes')} style={styles.input} placeholder="Notas opcionales" />
      </div>

      <div style={styles.actions}>
        <button type="submit" disabled={isSubmitting} style={styles.button}>
          {isSubmitting ? 'Guardando...' : 'Crear plan'}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { fontSize: '0.875rem', fontWeight: 600, color: '#374151' },
  input: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  error: { fontSize: '0.75rem', color: '#dc2626' },
  actions: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },
  button: {
    padding: '0.5rem 1rem',
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  radioGroup: { display: 'flex', gap: '1rem' },
  radioLabel: { display: 'flex', gap: '0.25rem', alignItems: 'center', fontSize: '0.875rem', cursor: 'pointer' },
};
