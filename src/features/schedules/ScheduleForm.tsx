// ScheduleForm — react-hook-form + Zod for creating/editing a schedule.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateSchedule } from './hooks';
import type { Schedule } from '../../lib/database.types';

const WEEKDAYS = [
  { key: 0, label: 'D' },  // Sunday
  { key: 1, label: 'L' },  // Monday
  { key: 2, label: 'M' },  // Tuesday
  { key: 3, label: 'X' },  // Wednesday
  { key: 4, label: 'J' },  // Thursday
  { key: 5, label: 'V' },  // Friday
  { key: 6, label: 'S' },  // Saturday
];

const scheduleSchema = z.object({
  time_of_day: z.string().min(1, 'La hora es obligatoria'),
  weekday_mask: z.number().int().min(0).max(127),
  timezone_id: z.string().min(1, 'La zona horaria es obligatoria'),
  notes: z.string(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleFormProps {
  medicationId: string;
  defaultTimezone?: string;
  schedule?: Schedule;
  onSuccess?: () => void;
}

export function ScheduleForm({ medicationId, defaultTimezone, schedule, onSuccess }: ScheduleFormProps) {
  const createMutation = useCreateSchedule();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      time_of_day: schedule?.time_of_day ?? '08:00',
      weekday_mask: schedule?.weekday_mask ?? 0,
      timezone_id: schedule?.timezone_id ?? defaultTimezone ?? 'America/Buenos_Aires',
      notes: schedule?.notes ?? '',
    },
  });

  const currentMask = watch('weekday_mask');

  const toggleDay = (bit: number) => {
    const newMask = currentMask ^ (1 << bit);
    setValue('weekday_mask', newMask);
  };

  const onSubmit = async (data: ScheduleFormData) => {
    const result = await createMutation.mutateAsync({
      medication_id: medicationId,
      time_of_day: data.time_of_day,
      weekday_mask: data.weekday_mask,
      timezone_id: data.timezone_id,
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
        <label htmlFor="time_of_day" style={styles.label}>Hora</label>
        <input id="time_of_day" type="time" {...register('time_of_day')} style={styles.input} />
        {errors.time_of_day && <span style={styles.error}>{errors.time_of_day.message}</span>}
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Días de la semana</label>
        <div style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => {
            const isActive = (currentMask & (1 << day.key)) !== 0;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key)}
                style={{
                  ...styles.weekdayBtn,
                  background: isActive ? '#0ea5e9' : '#f3f4f6',
                  color: isActive ? '#fff' : '#374151',
                }}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        {errors.weekday_mask && <span style={styles.error}>{errors.weekday_mask.message}</span>}
      </div>

      <div style={styles.field}>
        <label htmlFor="notes" style={styles.label}>Notas</label>
        <input id="notes" type="text" {...register('notes')} style={styles.input} placeholder="Notas opcionales" />
      </div>

      <div style={styles.actions}>
        <button type="submit" disabled={isSubmitting} style={styles.button}>
          {isSubmitting ? 'Guardando...' : 'Nuevo horario'}
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
  weekdayRow: { display: 'flex', gap: '0.25rem' },
  weekdayBtn: {
    width: '36px',
    height: '36px',
    border: '1px solid #d1d5db',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
};
