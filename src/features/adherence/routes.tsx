// Adherence route — detail page with 28-day chart.

import { useActivePaciente } from '../../stores/activePaciente';
import { AdherenceChart } from './AdherenceChart';

export default function AdherencePage() {
  const { activePacienteId } = useActivePaciente();

  if (!activePacienteId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Selecciona un paciente para ver su adherencia.
      </div>
    );
  }

  return (
    <div>
      <h1 style={styles.title}>Adherencia al tratamiento</h1>
      <AdherenceChart pacienteId={activePacienteId} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { margin: '0 0 1rem', fontSize: '1.5rem' },
};
