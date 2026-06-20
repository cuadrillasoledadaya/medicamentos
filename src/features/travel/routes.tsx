// Travel adjustment route — TZ change + trip shifts.

import { useActivePaciente } from '../../stores/activePaciente';
import { usePaciente } from '../pacientes/hooks';
import { TZChangeForm } from './TZChangeForm';
import { TripShiftForm } from './TripShiftForm';

export default function TravelPage() {
  const { activePacienteId } = useActivePaciente();
  const { data: paciente } = usePaciente(activePacienteId ?? '');

  if (!activePacienteId || !paciente) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Selecciona un paciente para ajustar su configuración de viaje.
      </div>
    );
  }

  return (
    <div>
      <h1 style={styles.title}>Ajustes de viaje</h1>

      {/* TZ change */}
      <TZChangeForm pacienteId={activePacienteId} currentTimezone={paciente.timezone_id} />

      {/* Trip shifts */}
      <TripShiftForm pacienteId={activePacienteId} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { margin: '0 0 1rem', fontSize: '1.5rem' },
};
