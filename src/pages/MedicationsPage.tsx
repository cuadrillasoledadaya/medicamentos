// MedicationsPage — real list grouped by active paciente with create form.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivePaciente } from '../stores/activePaciente';
import { useMedications, useArchiveMedication, useDeleteMedication } from '../features/medications/hooks';
import { MedicationForm } from '../features/medications/MedicationForm';
import { MedicationList } from '../features/medications/MedicationList';

export default function MedicationsPage() {
  const { activePacienteId } = useActivePaciente();
  const navigate = useNavigate();
  const { data: medications, isLoading } = useMedications(activePacienteId ?? '');
  const archiveMutation = useArchiveMedication();
  const deleteMutation = useDeleteMedication();
  const [showForm, setShowForm] = useState(false);

  if (!activePacienteId) {
    return (
      <div style={styles.empty}>
        <p style={{ color: '#888' }}>Selecciona un paciente para ver sus medicamentos.</p>
        <button onClick={() => navigate('/pacientes')} style={styles.button}>
          Ir a Pacientes
        </button>
      </div>
    );
  }

  if (isLoading) return <p style={{ color: '#888' }}>Cargando medicamentos...</p>;

  const handleArchive = async (id: string) => {
    await archiveMutation.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Medicamentos</h1>
        <button onClick={() => setShowForm(!showForm)} style={styles.button}>
          {showForm ? 'Cancelar' : 'Nuevo medicamento'}
        </button>
      </div>

      {showForm && (
        <div style={styles.formContainer}>
          <MedicationForm
            pacienteId={activePacienteId}
            onSuccess={() => setShowForm(false)}
          />
        </div>
      )}

      <MedicationList medications={medications ?? []} onArchive={handleArchive} onDelete={handleDelete} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title: { margin: 0, fontSize: '1.5rem' },
  button: {
    padding: '0.5rem 1rem',
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  formContainer: { marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' },
  empty: { textAlign: 'center', padding: '2rem 0' },
};
