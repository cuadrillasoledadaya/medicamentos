// MedicationForm — react-hook-form + Zod for creating/editing a medication.

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateMedication, useUpdateMedication, useMedications } from './hooks';
import { useCheckInteraction } from '../interactions/hooks';
import { InteractionAlert } from '../interactions/InteractionAlert';
import { usePaciente } from '../pacientes/hooks';
import { useCreateSchedule } from '../schedules/hooks';
import type { Medication } from '../../lib/database.types';

const DOSE_UNITS = [
  'mg', 'ml', 'gotas', 'UI', 'comprimidos',
  'parches', 'sobres', 'cucharadas', 'aplicaciones',
  'inyecciones', 'other',
];

// Frequency presets. intervalHours=0 means "manual" (no auto-generation):
// the user creates schedules one by one on the medication detail page.
const FREQUENCY_OPTIONS = [
  { value: 'manual', label: 'Personalizado (crear horarios manualmente)', intervalHours: 0 },
  { value: '24', label: '1 vez al día', intervalHours: 24 },
  { value: '12', label: 'Cada 12 horas (2 veces al día)', intervalHours: 12 },
  { value: '8', label: 'Cada 8 horas (3 veces al día)', intervalHours: 8 },
  { value: '6', label: 'Cada 6 horas (4 veces al día)', intervalHours: 6 },
  { value: '4', label: 'Cada 4 horas (6 veces al día)', intervalHours: 4 },
];

const DEFAULT_FIRST_DOSE = '08:00';

/**
 * Generate the daily time-of-day slots for a given interval, starting
 * at the user's chosen first-dose time and wrapping through 24h. For
 * an 8h interval starting at 09:00 this returns ["01:00", "09:00",
 * "17:00"]. For 6h starting at 08:00: ["02:00", "08:00", "14:00",
 * "20:00"]. For 24h: ["08:00"].
 */
function generateScheduleTimes(intervalHours: number, startTime: string): string[] {
  if (intervalHours <= 0) return [];
  const match = /^(\d{1,2}):(\d{2})$/.exec(startTime);
  if (!match) return [];
  const startMinutes = Number(match[1]) * 60 + Number(match[2]);
  const intervalMinutes = intervalHours * 60;
  const dayMinutes = 24 * 60;

  const slots = new Set<number>();
  let current = startMinutes;
  while (!slots.has(current)) {
    slots.add(current);
    current = (current + intervalMinutes) % dayMinutes;
  }
  return Array.from(slots)
    .sort((a, b) => a - b)
    .map((minutes) => {
      const hh = Math.floor(minutes / 60);
      const mm = minutes % 60;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    });
}

const ALL_DAYS_MASK = 127; // 0b1111111 = Sun..Sat

const medicationSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  dose_value: z.number().positive('La dosis debe ser mayor a 0'),
  dose_unit: z.string().min(1, 'La unidad es obligatoria'),
  dose_unit_other: z.string(),
  route: z.string().min(1, 'La vía es obligatoria'),
  frequency: z.string(),
  first_dose_time: z.string(),
  frequency_hint: z.string(),
  notes: z.string(),
  stock_estimate: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0),
}).refine((data) => {
  if (data.dose_unit === 'other' && data.dose_unit_other.trim() === '') {
    return false;
  }
  return true;
}, { message: 'Especifique la unidad personalizada', path: ['dose_unit_other'] });

type MedicationFormData = z.infer<typeof medicationSchema>;

interface MedicationFormProps {
  pacienteId: string;
  medication?: Medication;
  onSuccess?: () => void;
}

export function MedicationForm({ pacienteId, medication, onSuccess }: MedicationFormProps) {
  const createMutation = useCreateMedication();
  const updateMutation = useUpdateMedication();
  const createScheduleMutation = useCreateSchedule();
  const { data: activePaciente } = usePaciente(pacienteId);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MedicationFormData>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: medication?.name ?? '',
      dose_value: medication?.dose_value ?? 0,
      dose_unit: medication?.dose_unit ?? 'mg',
      dose_unit_other: medication?.dose_unit_other ?? '',
      route: medication?.route ?? '',
      frequency: 'manual',
      first_dose_time: DEFAULT_FIRST_DOSE,
      frequency_hint: medication?.frequency_hint ?? '',
      notes: medication?.notes ?? '',
      stock_estimate: medication?.stock_estimate ?? 30,
      low_stock_threshold: medication?.low_stock_threshold ?? 7,
    },
  });

  const { data: existingMeds } = useMedications(pacienteId);

  const activeMedNames = existingMeds
    ?.filter((m) => m.active && (!medication || m.id !== medication.id))
    .map((m) => m.name) ?? [];

  const watchedName = watch('name');
  const { data: interactionWarnings } = useCheckInteraction(
    watchedName ?? '',
    activeMedNames,
  );

  const [showInteractions, setShowInteractions] = useState(false);

  // Show interaction alert when name changes and there are warnings
  useEffect(() => {
    if (interactionWarnings && interactionWarnings.length > 0 && !medication) {
      setShowInteractions(true);
    }
  }, [interactionWarnings, medication]);

  const selectedUnit = watch('dose_unit');
  const selectedFrequency = watch('frequency');
  const firstDoseTime = watch('first_dose_time');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scheduleProgress, setScheduleProgress] = useState<string | null>(null);

  if (!pacienteId) {
    return (
      <div style={{ padding: '1rem', color: '#dc2626', background: '#fef2f2', borderRadius: '4px' }}>
        No hay un paciente activo seleccionado. Andá a "Pacientes" y elegí o creá uno antes de agregar medicamentos.
      </div>
    );
  }

  const onSubmit = async (data: MedicationFormData) => {
    setSubmitError(null);
    setScheduleProgress(null);

    const frequencyOption = FREQUENCY_OPTIONS.find((opt) => opt.value === data.frequency);
    const intervalHours = frequencyOption?.intervalHours ?? 0;
    // frequency_hint defaults to the human-readable frequency label
    // when the user picked a preset, otherwise the existing text.
    const frequencyHint = intervalHours > 0
      ? frequencyOption!.label
      : (data.frequency_hint || null);

    const payload = {
      paciente_id: pacienteId,
      name: data.name,
      dose_value: data.dose_value,
      dose_unit: data.dose_unit,
      dose_unit_other: data.dose_unit === 'other' ? data.dose_unit_other : null,
      route: data.route,
      frequency_hint: frequencyHint,
      notes: data.notes || null,
      stock_estimate: data.stock_estimate,
      low_stock_threshold: data.low_stock_threshold,
    };

    try {
      if (medication) {
        const result = await updateMutation.mutateAsync({
          id: medication.id,
          patch: {
            name: data.name,
            dose_value: data.dose_value,
            dose_unit: data.dose_unit,
            dose_unit_other: data.dose_unit === 'other' ? data.dose_unit_other : null,
            route: data.route,
            frequency_hint: frequencyHint,
            notes: data.notes || null,
            stock_estimate: data.stock_estimate,
            low_stock_threshold: data.low_stock_threshold,
          },
        });
        if (result.error) {
          setSubmitError(result.error.message);
          return;
        }
        onSuccess?.();
        return;
      }

      // CREATE flow: insert the medication, then auto-generate schedules
      // if a frequency preset was selected.
      const result = await createMutation.mutateAsync(payload);
      if (result.error) {
        setSubmitError(result.error.message);
        return;
      }

      if (intervalHours > 0 && activePaciente?.timezone_id) {
        const times = generateScheduleTimes(intervalHours, firstDoseTime);
        const timezoneId = activePaciente.timezone_id;
        setScheduleProgress(`Generando ${times.length} horarios…`);

        for (const time of times) {
          const schedResult = await createScheduleMutation.mutateAsync({
            medication_id: result.data!.id,
            time_of_day: time,
            weekday_mask: ALL_DAYS_MASK,
            timezone_id: timezoneId,
            notes: null,
          });
          if (schedResult.error) {
            setSubmitError(
              `Medicamento creado, pero falló la creación del horario ${time}: ${schedResult.error.message}. ` +
              'Podés crear los horarios manualmente desde la página del medicamento.',
            );
            return;
          }
        }
        setScheduleProgress(null);
      } else if (intervalHours > 0 && !activePaciente?.timezone_id) {
        // Defensive: paciente has no timezone. The form's pre-conditions
        // should prevent this, but if we land here we surface a clear
        // error rather than silently creating schedules with a wrong TZ.
        setSubmitError(
          'Medicamento creado, pero el paciente activo no tiene zona horaria definida. ' +
          'Editá el paciente y volvé a crear el medicamento, o creá los horarios manualmente.',
        );
        return;
      }

      reset();
      onSuccess?.();
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Error desconocido al guardar');
    }
  };

  const frequencyTimes = selectedFrequency && selectedFrequency !== 'manual'
    ? generateScheduleTimes(
        FREQUENCY_OPTIONS.find((o) => o.value === selectedFrequency)?.intervalHours ?? 0,
        firstDoseTime,
      )
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
      {/* Interaction alert for new medications */}
      {!medication && showInteractions && interactionWarnings && interactionWarnings.length > 0 && (
        <InteractionAlert
          interactions={interactionWarnings}
          onDismiss={() => setShowInteractions(false)}
        />
      )}

      {submitError && (
        <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '0.875rem' }}>
          <strong>Error:</strong> {submitError}
        </div>
      )}
      {scheduleProgress && (
        <div style={{ padding: '0.75rem', background: '#eff6ff', color: '#0369a1', borderRadius: '4px', fontSize: '0.875rem' }}>
          {scheduleProgress}
        </div>
      )}
      <div style={styles.field}>
        <label htmlFor="name" style={styles.label}>Nombre</label>
        <input id="name" type="text" {...register('name')} style={styles.input} placeholder="Nombre del medicamento" />
        {errors.name && <span style={styles.error}>{errors.name.message}</span>}
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.field, flex: 1 }}>
          <label htmlFor="dose_value" style={styles.label}>Dosis</label>
          <input id="dose_value" type="number" step="any" {...register('dose_value', { valueAsNumber: true })} style={styles.input} />
          {errors.dose_value && <span style={styles.error}>{errors.dose_value.message}</span>}
        </div>

        <div style={{ ...styles.field, flex: 1 }}>
          <label htmlFor="dose_unit" style={styles.label}>Unidad</label>
          <select id="dose_unit" {...register('dose_unit')} style={styles.input}>
            {DOSE_UNITS.map((u) => <option key={u} value={u}>{u === 'other' ? 'Otra' : u}</option>)}
          </select>
          {errors.dose_unit && <span style={styles.error}>{errors.dose_unit.message}</span>}
        </div>
      </div>

      {selectedUnit === 'other' && (
        <div style={styles.field}>
          <label htmlFor="dose_unit_other" style={styles.label}>Otra unidad</label>
          <input id="dose_unit_other" type="text" {...register('dose_unit_other')} style={styles.input} placeholder="Especifique la unidad" />
          {errors.dose_unit_other && <span style={styles.error}>{errors.dose_unit_other.message}</span>}
        </div>
      )}

      <div style={styles.field}>
        <label htmlFor="route" style={styles.label}>Vía</label>
        <input id="route" type="text" {...register('route')} style={styles.input} placeholder="Oral, sublingual, etc." />
      </div>

      {!medication && (
        <>
          <div style={styles.field}>
            <label htmlFor="frequency" style={styles.label}>Frecuencia</label>
            <select id="frequency" {...register('frequency')} style={styles.input}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {selectedFrequency && selectedFrequency !== 'manual' && (
            <div style={styles.field}>
              <label htmlFor="first_dose_time" style={styles.label}>Primera toma a las</label>
              <input
                id="first_dose_time"
                type="time"
                {...register('first_dose_time')}
                style={styles.input}
              />
              {frequencyTimes.length > 0 ? (
                <span style={{ fontSize: '0.75rem', color: '#0ea5e9' }}>
                  Se crearán {frequencyTimes.length} horarios a las {frequencyTimes.join(', ')}
                  {' '}(todos los días, zona horaria {activePaciente?.timezone_id ?? 'del paciente'}).
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                  Hora inválida. Probá con formato HH:MM (por ejemplo 09:00 o 21:30).
                </span>
              )}
            </div>
          )}

          {(!selectedFrequency || selectedFrequency === 'manual') && (
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Sin frecuencia automática. Después podrás crear los horarios manualmente.
            </span>
          )}
        </>
      )}

      <div style={styles.field}>
        <label htmlFor="notes" style={styles.label}>Notas</label>
        <textarea id="notes" {...register('notes')} style={{ ...styles.input, minHeight: '60px' }} />
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.field, flex: 1 }}>
          <label htmlFor="stock_estimate" style={styles.label}>Stock estimado</label>
          <input id="stock_estimate" type="number" {...register('stock_estimate', { valueAsNumber: true })} style={styles.input} />
        </div>
        <div style={{ ...styles.field, flex: 1 }}>
          <label htmlFor="low_stock_threshold" style={styles.label}>Alerta de stock</label>
          <input id="low_stock_threshold" type="number" {...register('low_stock_threshold', { valueAsNumber: true })} style={styles.input} />
        </div>
      </div>

      <div style={styles.actions}>
        <button type="submit" disabled={isSubmitting} style={styles.button}>
          {isSubmitting ? 'Guardando...' : medication ? 'Actualizar' : 'Crear medicamento'}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' },
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
