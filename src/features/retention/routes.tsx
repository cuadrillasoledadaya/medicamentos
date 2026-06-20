// Retention admin route — view and update retention policies.

import { useActivePaciente } from '../../stores/activePaciente';
import { RetentionSettings } from './RetentionSettings';

export default function RetentionPage() {
  const { activePacienteId } = useActivePaciente();

  if (!activePacienteId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Selecciona un paciente para ver su política de retención.
      </div>
    );
  }

  return (
    <div>
      <h1 style={styles.title}>Retención de datos</h1>
      <RetentionSettings pacienteId={activePacienteId} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { margin: '0 0 1rem', fontSize: '1.5rem' },
};
