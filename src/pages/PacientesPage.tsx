// PacientesPage — list of pacientes with create form and family panel.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePacientes, useDeletePaciente } from '../features/pacientes/hooks';
import { PacienteForm } from '../features/pacientes/PacienteForm';
import { FamilyPanel } from '../features/family/FamilyPanel';
import { useActivePaciente } from '../stores/activePaciente';

export default function PacientesPage() {
  const { data: pacientes, isLoading } = usePacientes();
  const { activePacienteId, setActivePaciente } = useActivePaciente();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const deletePaciente = useDeletePaciente();

  if (isLoading) return <p style={{ color: '#888' }}>Cargando pacientes...</p>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Pacientes</h1>
        <button onClick={() => setShowForm(!showForm)} style={styles.button}>
          {showForm ? 'Cancelar' : 'Nuevo paciente'}
        </button>
      </div>

      {showForm && (
        <div style={styles.formContainer}>
          <PacienteForm onSuccess={() => { setShowForm(false); }} />
        </div>
      )}

      {pacientes && pacientes.length > 0 ? (
        <ul style={styles.list}>
          {pacientes.map((p) => (
            <li
              key={p.id}
              style={{
                ...styles.item,
                borderLeft: p.id === activePacienteId ? '3px solid #0ea5e9' : '3px solid transparent',
              }}
            >
              <div style={styles.itemInfo} onClick={() => { setActivePaciente(p.id); }}>
                <span style={styles.name}>{p.name}</span>
                <span style={styles.meta}>
                  {p.dob ? `Nac. ${p.dob}` : 'Sin fecha'} · {p.timezone_id}
                </span>
              </div>
              <div style={styles.itemActions}>
                <button
                  onClick={() => {
                    setActivePaciente(p.id);
                    navigate('/');
                  }}
                  style={styles.selectBtn}
                >
                  Seleccionar
                </button>
                <button
                  onClick={() => setSelectedPacienteId(selectedPacienteId === p.id ? null : p.id)}
                  style={styles.familyBtn}
                >
                  {selectedPacienteId === p.id ? 'Ocultar' : 'Familiares'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`¿Eliminar a "${p.name}"? Esta acción borra también sus medicamentos, horarios, tomas y registros familiares. No se puede deshacer.`)) {
                      deletePaciente.mutate(p.id, {
                        onError: (e) => {
                          alert(`Error al eliminar: ${e?.message ?? 'desconocido'}`);
                        },
                        onSuccess: () => {
                          if (activePacienteId === p.id) {
                            setActivePaciente(null);
                          }
                        },
                      });
                    }
                  }}
                  style={styles.deleteBtn}
                  aria-label={`Eliminar ${p.name}`}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div style={styles.empty}>
          <p style={{ color: '#888' }}>No hay pacientes registrados.</p>
          <p style={{ color: '#888', fontSize: '0.875rem' }}>
            Crea tu primer paciente para comenzar.
          </p>
        </div>
      )}

      {selectedPacienteId && (
        <div style={styles.familyContainer}>
          <FamilyPanel pacienteId={selectedPacienteId} />
        </div>
      )}
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
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  itemInfo: { cursor: 'pointer', flex: 1 },
  name: { fontWeight: 600, fontSize: '1rem', display: 'block' },
  meta: { fontSize: '0.75rem', color: '#6b7280' },
  itemActions: { display: 'flex', gap: '0.5rem' },
  selectBtn: {
    padding: '0.375rem 0.75rem',
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  familyBtn: {
    padding: '0.375rem 0.75rem',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  deleteBtn: {
    padding: '0.25rem 0.5rem',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  empty: { textAlign: 'center', padding: '2rem 0', color: '#888' },
  familyContainer: { marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' },
};
