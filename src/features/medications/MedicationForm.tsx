// MedicationForm — react-hook-form + Zod for creating/editing a medication.

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateMedication, useUpdateMedication, useMedications } from './hooks';
import { useCheckInteraction } from '../interactions/hooks';
import { InteractionAlert } from '../interactions/InteractionAlert';
import type { Medication } from '../../lib/database.types';

const DOSE_UNITS = [
  'mg', 'ml', 'gotas', 'UI', 'comprimidos',
  'parches', 'sobres', 'cucharadas', 'aplicaciones',
  'inyecciones', 'other',
];

const medicationSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  dose_value: z.number().positive('La dosis debe ser mayor a 0'),
  dose_unit: z.string().min(1, 'La unidad es obligatoria'),
  dose_unit_other: z.string(),
  route: z.string().min(1, 'La vía es obligatoria'),
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!pacienteId) {
    return (
      <div style={{ padding: '1rem', color: '#dc2626', background: '#fef2f2', borderRadius: '4px' }}>
        No hay un paciente activo seleccionado. Andá a "Pacientes" y elegí o creá uno antes de agregar medicamentos.
      </div>
    );
  }

  const onSubmit = async (data: MedicationFormData) => {
    setSubmitError(null);
    const payload = {
      paciente_id: pacienteId,
      name: data.name,
      dose_value: data.dose_value,
      dose_unit: data.dose_unit,
      dose_unit_other: data.dose_unit === 'other' ? data.dose_unit_other : null,
      route: data.route,
      frequency_hint: data.frequency_hint || null,
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
            frequency_hint: data.frequency_hint || null,
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
      } else {
        const result = await createMutation.mutateAsync(payload);
        if (result.error) {
          setSubmitError(result.error.message);
          return;
        }
        reset();
        onSuccess?.();
      }
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Error desconocido al guardar');
    }
  };

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
        {errors.route && <span style={styles.error}>{errors.route.message}</span>}
      </div>

      <div style={styles.field}>
        <label htmlFor="frequency_hint" style={styles.label}>Frecuencia</label>
        <input id="frequency_hint" type="text" {...register('frequency_hint')} style={styles.input} placeholder="Cada 8 horas, en ayunas, etc." />
      </div>

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
