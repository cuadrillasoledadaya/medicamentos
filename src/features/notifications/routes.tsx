// Notification settings routes — page with per-paciente channel toggles + medication overrides.

import { useState } from 'react';
import { useActivePaciente } from '../../stores/activePaciente';
import { NotificationSettingsForm } from './NotificationSettingsForm';
import { MedicationOverrideList } from './MedicationOverrideList';

export default function NotificationSettingsPage() {
  const { activePacienteId } = useActivePaciente();
  const [showOverrides, setShowOverrides] = useState(false);

  if (!activePacienteId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Selecciona un paciente para configurar sus notificaciones.
      </div>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Notificaciones</h1>
        <button onClick={() => setShowOverrides(!showOverrides)} style={styles.toggleBtn}>
          {showOverrides ? 'Ocultar overrides' : 'Overrides por medicamento'}
        </button>
      </div>

      <NotificationSettingsForm pacienteId={activePacienteId} />

      {showOverrides && (
        <div style={styles.overridesWrapper}>
          <MedicationOverrideList pacienteId={activePacienteId} />
        </div>
      )}
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
  overridesWrapper: { marginTop: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
};
