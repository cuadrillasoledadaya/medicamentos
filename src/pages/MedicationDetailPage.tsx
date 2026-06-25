// MedicationDetailPage — shows one medication's details, its schedules, and action buttons.

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMedication } from '../features/medications/hooks';
import { useSchedules } from '../features/schedules/hooks';
import { useActivePaciente } from '../stores/activePaciente';
import { usePaciente } from '../features/pacientes/hooks';
import { ScheduleForm } from '../features/schedules/ScheduleForm';
import { ScheduleList } from '../features/schedules/ScheduleList';
import { PhotoUpload } from '../features/medications/PhotoUpload';
import { useUpdateMedication } from '../features/medications/hooks';

export default function MedicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activePacienteId } = useActivePaciente();
  const { data: activePaciente } = usePaciente(activePacienteId ?? '');
  const { data: medication, isLoading: medLoading } = useMedication(id ?? '');
  const { data: schedules, isLoading: schedLoading } = useSchedules(id ?? '');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const updateMutation = useUpdateMedication();

  if (!id) return <p>ID no válido.</p>;
  if (medLoading) return <p style={{ color: '#888' }}>Cargando medicamento...</p>;
  if (!medication) return <p>Medicamento no encontrado.</p>;

  const handlePhotoUploaded = async (photoPath: string) => {
    await updateMutation.mutateAsync({ id, patch: { photo_url: photoPath } });
  };

  return (
    <div>
      <Link to="/medications" style={{ color: '#0ea5e9' }}>← Volver a medicamentos</Link>

      <div style={styles.section}>
        <h1 style={styles.title}>{medication.name}</h1>
        <div style={styles.meta}>
          <span>Dosis: {medication.dose_value} {medication.dose_unit === 'other' ? medication.dose_unit_other : medication.dose_unit}</span>
          <span>Vía: {medication.route}</span>
          <span>Stock: {medication.stock_estimate}</span>
          <span style={{ color: medication.active ? '#16a34a' : '#dc2626' }}>
            {medication.active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        {medication.frequency_hint && <p style={styles.hint}>Frecuencia: {medication.frequency_hint}</p>}
        {medication.notes && <p style={styles.notes}>Notas: {medication.notes}</p>}
      </div>

      <div style={styles.section}>
        <h2 style={styles.subtitle}>Foto</h2>
        <PhotoUpload medicationId={id} onUploaded={handlePhotoUploaded} />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.subtitle}>Horarios</h2>
          <button onClick={() => setShowScheduleForm(!showScheduleForm)} style={styles.button}>
            {showScheduleForm ? 'Cancelar' : 'Nuevo horario'}
          </button>
        </div>

        {showScheduleForm && (
          <div style={styles.formContainer}>
            <ScheduleForm
              medicationId={id}
              defaultTimezone={activePaciente?.timezone_id ?? 'America/Buenos_Aires'}
              onSuccess={() => setShowScheduleForm(false)}
            />
          </div>
        )}

        {schedLoading ? (
          <p style={{ color: '#888' }}>Cargando horarios...</p>
        ) : (
          <ScheduleList schedules={schedules ?? []} />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginTop: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  title: { margin: '0.5rem 0', fontSize: '1.5rem' },
  subtitle: { margin: 0, fontSize: '1.125rem' },
  meta: { display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', flexWrap: 'wrap' },
  hint: { fontSize: '0.875rem', color: '#6b7280' },
  notes: { fontSize: '0.875rem', color: '#6b7280' },
  button: {
    padding: '0.375rem 0.75rem',
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  formContainer: { marginBottom: '1rem' },
};
