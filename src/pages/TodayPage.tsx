// TodayPage — deep-link landing page for push notifications.
// Renders TodayList with optional tomaId highlight.
// PR3 will add the auto-trigger hook and IntakeActionModal mount.

import { useSearchParams } from 'react-router-dom';
import { TodayList } from '@/features/tomas/TodayList';
import { useActivePaciente } from '@/stores/activePaciente';

export default function TodayPage() {
  const [searchParams] = useSearchParams();
  const tomaId = searchParams.get('tomaId') || undefined;
  const { activePacienteId } = useActivePaciente();

  if (!activePacienteId) {
    return <p style={{ color: '#888' }}>No hay paciente seleccionado.</p>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Tomas de hoy</h2>
      <TodayList pacienteId={activePacienteId} highlightTomaId={tomaId} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: '600px', margin: '0 auto' },
  heading: { fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' },
};
