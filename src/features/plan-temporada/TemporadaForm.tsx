// TemporadaForm — react-hook-form + Zod for creating a temporada.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTemporada } from './hooks';

const temporadaSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  start_date: z.string().min(1, 'La fecha de inicio es obligatoria'),
  end_date: z.string().min(1, 'La fecha de fin es obligatoria'),
}).refine((data) => {
  return new Date(data.end_date) >= new Date(data.start_date);
}, { message: 'La fecha de fin debe ser igual o posterior a la de inicio', path: ['end_date'] });

type TemporadaFormData = z.infer<typeof temporadaSchema>;

interface TemporadaFormProps {
  pacienteId: string;
  onSuccess?: () => void;
}

export function TemporadaForm({ pacienteId, onSuccess }: TemporadaFormProps) {
  const createMutation = useCreateTemporada();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TemporadaFormData>({
    resolver: zodResolver(temporadaSchema),
    defaultValues: { name: '', start_date: '', end_date: '' },
  });

  const onSubmit = async (data: TemporadaFormData) => {
    const result = await createMutation.mutateAsync({
      paciente_id: pacienteId,
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
    });
    if (!result.error) {
      reset();
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
      <div style={styles.field}>
        <label htmlFor="name" style={styles.label}>Nombre</label>
        <input id="name" type="text" {...register('name')} style={styles.input} placeholder="Ej: Invierno 2026" />
        {errors.name && <span style={styles.error}>{errors.name.message}</span>}
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.field, flex: 1 }}>
          <label htmlFor="start_date" style={styles.label}>Fecha inicio</label>
          <input id="start_date" type="date" {...register('start_date')} style={styles.input} />
          {errors.start_date && <span style={styles.error}>{errors.start_date.message}</span>}
        </div>
        <div style={{ ...styles.field, flex: 1 }}>
          <label htmlFor="end_date" style={styles.label}>Fecha fin</label>
          <input id="end_date" type="date" {...register('end_date')} style={styles.input} />
          {errors.end_date && <span style={styles.error}>{errors.end_date.message}</span>}
        </div>
      </div>

      <div style={styles.actions}>
        <button type="submit" disabled={isSubmitting} style={styles.button}>
          {isSubmitting ? 'Guardando...' : 'Crear temporada'}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  row: { display: 'flex', gap: '1rem' },
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
};
