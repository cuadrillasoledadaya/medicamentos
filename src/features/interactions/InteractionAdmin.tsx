// InteractionAdmin — CRUD UI for curated drug-drug interaction pairs.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useInteractions,
  useCreateInteraction,
  useUpdateInteraction,
  useDeleteInteraction,
} from './hooks';

const SEVERITY_OPTIONS = ['info', 'caution', 'warning', 'severe'] as const;

const interactionSchema = z.object({
  drug_a: z.string().min(1, 'Drug A is required'),
  drug_b: z.string().min(1, 'Drug B is required'),
  severity: z.enum(SEVERITY_OPTIONS),
  description: z.string().min(1, 'Description is required'),
  source_notes: z.string(),
});

type InteractionFormData = z.infer<typeof interactionSchema>;

const severityColor: Record<string, string> = {
  info: '#3b82f6',
  caution: '#eab308',
  warning: '#f97316',
  severe: '#dc2626',
};

export default function InteractionAdmin() {
  const { data: interactions, isLoading } = useInteractions();
  const createMutation = useCreateInteraction();
  const updateMutation = useUpdateInteraction();
  const deleteMutation = useDeleteInteraction();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InteractionFormData>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      drug_a: '',
      drug_b: '',
      severity: 'caution',
      description: '',
      source_notes: '',
    },
  });

  const onSubmit = async (data: InteractionFormData) => {
    setSubmitError(null);
    try {
      if (editingId) {
        const result = await updateMutation.mutateAsync({
          id: editingId,
          patch: {
            drug_a: data.drug_a,
            drug_b: data.drug_b,
            severity: data.severity,
            description: data.description,
            source_notes: data.source_notes || null,
          },
        });
        if (result.error) {
          setSubmitError(result.error.message);
          return;
        }
        setEditingId(null);
      } else {
        const result = await createMutation.mutateAsync(data);
        if (result.error) {
          setSubmitError(result.error.message);
          return;
        }
      }
      reset();
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Error desconocido');
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    reset({
      drug_a: item.drug_a,
      drug_b: item.drug_b,
      severity: item.severity,
      description: item.description,
      source_notes: item.source_notes ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset({ drug_a: '', drug_b: '', severity: 'caution', description: '', source_notes: '' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta interacción?')) return;
    await deleteMutation.mutateAsync(id);
  };

  if (isLoading) return <p style={{ color: '#888' }}>Cargando interacciones...</p>;

  return (
    <div>
      <h1 style={styles.title}>Administrar interacciones</h1>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
        {submitError && (
          <div style={styles.errorBanner}>
            <strong>Error:</strong> {submitError}
          </div>
        )}

        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label htmlFor="drug_a" style={styles.label}>Medicamento A</label>
            <input id="drug_a" {...register('drug_a')} style={styles.input} placeholder="Nombre genérico" />
            {errors.drug_a && <span style={styles.errorText}>{errors.drug_a.message}</span>}
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label htmlFor="drug_b" style={styles.label}>Medicamento B</label>
            <input id="drug_b" {...register('drug_b')} style={styles.input} placeholder="Nombre genérico" />
            {errors.drug_b && <span style={styles.errorText}>{errors.drug_b.message}</span>}
          </div>
        </div>

        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label htmlFor="severity" style={styles.label}>Severidad</label>
            <select id="severity" {...register('severity')} style={styles.input}>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{ ...styles.field, flex: 2 }}>
            <label htmlFor="source_notes" style={styles.label}>Fuente</label>
            <input id="source_notes" {...register('source_notes')} style={styles.input} placeholder="ANMAT, FDA, etc." />
          </div>
        </div>

        <div style={styles.field}>
          <label htmlFor="description" style={styles.label}>Descripción</label>
          <textarea id="description" {...register('description')} style={{ ...styles.input, minHeight: '60px' }} />
          {errors.description && <span style={styles.errorText}>{errors.description.message}</span>}
        </div>

        <div style={styles.actions}>
          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar interacción'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={styles.cancelBtn}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div style={styles.listSection}>
        <h2 style={styles.subtitle}>Pares registrados ({interactions?.length ?? 0})</h2>
        {interactions && interactions.length > 0 ? (
          <ul style={styles.list}>
            {interactions.map((item: any) => (
              <li key={item.id} style={styles.listItem}>
                <div style={styles.itemInfo}>
                  <span style={styles.drugPair}>
                    {item.drug_a} ↔ {item.drug_b}
                  </span>
                  <span style={{
                    ...styles.severityBadge,
                    background: severityColor[item.severity] + '22',
                    color: severityColor[item.severity],
                  }}>
                    {item.severity}
                  </span>
                  <span style={styles.itemDesc}>{item.description}</span>
                  {item.source_notes && (
                    <span style={styles.source}>Fuente: {item.source_notes}</span>
                  )}
                </div>
                <div style={styles.itemActions}>
                  <button onClick={() => startEdit(item)} style={styles.editBtn}>Editar</button>
                  <button onClick={() => handleDelete(item.id)} style={styles.deleteBtn}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#888' }}>No hay interacciones registradas.</p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { margin: '0 0 1rem', fontSize: '1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', marginBottom: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' },
  row: { display: 'flex', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { fontSize: '0.875rem', fontWeight: 600, color: '#374151' },
  input: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' },
  errorText: { fontSize: '0.75rem', color: '#dc2626' },
  errorBanner: { padding: '0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '0.875rem' },
  actions: { display: 'flex', gap: '0.5rem' },
  button: { padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' },
  cancelBtn: { padding: '0.5rem 1rem', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' },
  listSection: { maxWidth: '800px' },
  subtitle: { margin: '0 0 1rem', fontSize: '1.125rem' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.75rem', marginBottom: '0.5rem', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 },
  drugPair: { fontWeight: 600, fontSize: '0.875rem' },
  severityBadge: { display: 'inline-block', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 700, width: 'fit-content' },
  itemDesc: { fontSize: '0.8125rem', color: '#6b7280' },
  source: { fontSize: '0.75rem', color: '#9ca3af' },
  itemActions: { display: 'flex', gap: '0.25rem' },
  editBtn: { padding: '0.25rem 0.5rem', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' },
  deleteBtn: { padding: '0.25rem 0.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' },
};
