// StockAdjustForm — manual stock adjustment with required reason.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdjustStock } from './hooks';

const adjustSchema = z.object({
  newEstimate: z.number().int().min(0, 'El stock debe ser >= 0'),
  reason: z.string().min(1, 'El motivo es obligatorio'),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

interface StockAdjustFormProps {
  medicationId: string;
  medicationName: string;
  currentStock: number;
  onSuccess?: () => void;
}

export function StockAdjustForm({ medicationId, medicationName, currentStock, onSuccess }: StockAdjustFormProps) {
  const adjustMutation = useAdjustStock();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      newEstimate: currentStock,
      reason: '',
    },
  });

  const onSubmit = async (data: AdjustFormData) => {
    setSubmitError(null);
    setSuccessMsg(null);
    try {
      const result = await adjustMutation.mutateAsync({
        medicationId,
        newEstimate: data.newEstimate,
        reason: data.reason,
      });
      if (result.error) {
        setSubmitError(result.error.message);
        return;
      }
      setSuccessMsg(`Stock de "${medicationName}" actualizado de ${currentStock} a ${data.newEstimate}.`);
      reset({ newEstimate: data.newEstimate, reason: '' });
      onSuccess?.();
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Error desconocido');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
      <h3 style={styles.title}>Ajustar stock: {medicationName}</h3>
      <p style={styles.current}>Stock actual: <strong>{currentStock}</strong></p>

      {submitError && (
        <div style={styles.errorBanner}>
          <strong>Error:</strong> {submitError}
        </div>
      )}
      {successMsg && (
        <div style={styles.successBanner}>
          {successMsg}
        </div>
      )}

      <div style={styles.field}>
        <label htmlFor="newEstimate" style={styles.label}>Nuevo stock estimado</label>
        <input
          id="newEstimate"
          type="number"
          {...register('newEstimate', { valueAsNumber: true })}
          style={styles.input}
        />
        {errors.newEstimate && <span style={styles.errorText}>{errors.newEstimate.message}</span>}
      </div>

      <div style={styles.field}>
        <label htmlFor="reason" style={styles.label}>Motivo <span style={styles.required}>(obligatorio)</span></label>
        <textarea
          id="reason"
          {...register('reason')}
          style={{ ...styles.input, minHeight: '50px' }}
          placeholder="Ej: nueva receta recibida, conteo manual, etc."
        />
        {errors.reason && <span style={styles.errorText}>{errors.reason.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting} style={styles.button}>
        {isSubmitting ? 'Guardando...' : 'Ajustar stock'}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', padding: '1rem', background: '#f9fafb', borderRadius: '8px' },
  title: { margin: 0, fontSize: '1rem' },
  current: { margin: 0, fontSize: '0.875rem', color: '#6b7280' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { fontSize: '0.875rem', fontWeight: 600, color: '#374151' },
  required: { color: '#dc2626' },
  input: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' },
  errorText: { fontSize: '0.75rem', color: '#dc2626' },
  errorBanner: { padding: '0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '0.875rem' },
  successBanner: { padding: '0.75rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '4px', fontSize: '0.875rem' },
  button: { padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', alignSelf: 'flex-start' },
};
