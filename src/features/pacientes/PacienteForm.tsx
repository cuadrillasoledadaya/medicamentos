// PacienteForm — react-hook-form + Zod for creating/editing a paciente.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePaciente } from './hooks';
import type { Paciente } from '../../lib/database.types';

const pacienteSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  dob: z.string().optional().or(z.literal('')),
  timezone_id: z.string().min(1, 'La zona horaria es obligatoria'),
});

type PacienteFormData = z.infer<typeof pacienteSchema>;

interface PacienteFormProps {
  paciente?: Paciente;
  onSuccess?: () => void;
}

const COMMON_TIMEZONES = [
  'America/Buenos_Aires',
  'America/Cordoba',
  'America/Montevideo',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'Europe/Madrid',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
];

export function PacienteForm({ paciente, onSuccess }: PacienteFormProps) {
  const createMutation = useCreatePaciente();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      name: paciente?.name ?? '',
      dob: paciente?.dob ?? '',
      timezone_id: paciente?.timezone_id ?? 'America/Buenos_Aires',
    },
  });

  const onSubmit = async (data: PacienteFormData) => {
    const payload = {
      name: data.name,
      dob: data.dob || null,
      timezone_id: data.timezone_id,
    };

    const result = await createMutation.mutateAsync(payload);
    if (!result.error) {
      reset();
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
      <div style={styles.field}>
        <label htmlFor="name" style={styles.label}>Nombre</label>
        <input
          id="name"
          type="text"
          {...register('name')}
          style={styles.input}
          placeholder="Nombre del paciente"
        />
        {errors.name && <span style={styles.error}>{errors.name.message}</span>}
      </div>

      <div style={styles.field}>
        <label htmlFor="dob" style={styles.label}>Fecha de nacimiento</label>
        <input
          id="dob"
          type="date"
          {...register('dob')}
          style={styles.input}
        />
        {errors.dob && <span style={styles.error}>{errors.dob.message}</span>}
      </div>

      <div style={styles.field}>
        <label htmlFor="timezone_id" style={styles.label}>Zona horaria</label>
        <select
          id="timezone_id"
          {...register('timezone_id')}
          style={styles.input}
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
        {errors.timezone_id && <span style={styles.error}>{errors.timezone_id.message}</span>}
      </div>

      <div style={styles.actions}>
        <button type="submit" disabled={isSubmitting} style={styles.button}>
          {isSubmitting ? 'Guardando...' : 'Crear paciente'}
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
};
