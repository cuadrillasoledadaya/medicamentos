// Reports route — PDF generation + share link form.

import { useActivePaciente } from '../../stores/activePaciente';
import { ReportForm } from './ReportForm';

export default function ReportsPage() {
  const { activePacienteId } = useActivePaciente();

  if (!activePacienteId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Selecciona un paciente para generar un reporte.
      </div>
    );
  }

  return (
    <div>
      <h1 style={styles.title}>Exportar reporte</h1>
      <ReportForm pacienteId={activePacienteId} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { margin: '0 0 1rem', fontSize: '1.5rem' },
};
