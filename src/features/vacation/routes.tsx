// Vacation management route — list + create form.

import { useState } from 'react';
import { useActivePaciente } from '../../stores/activePaciente';
import { VacationList } from './VacationList';
import { VacationForm } from './VacationForm';

export default function VacationPage() {
  const { activePacienteId } = useActivePaciente();
  const [showForm, setShowForm] = useState(false);

  if (!activePacienteId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Selecciona un paciente para gestionar sus vacaciones.
      </div>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Vacaciones / Pausas</h1>
        <button onClick={() => setShowForm(!showForm)} style={styles.toggleBtn}>
          {showForm ? 'Cerrar formulario' : '+ Nueva vacaciones'}
        </button>
      </div>

      {showForm && (
        <div style={styles.formWrapper}>
          <VacationForm pacienteId={activePacienteId} onSuccess={() => setShowForm(false)} />
        </div>
      )}

      <VacationList pacienteId={activePacienteId} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title: { margin: 0, fontSize: '1.5rem' },
  toggleBtn: {
    padding: '0.5rem 1rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  formWrapper: { marginBottom: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
};
