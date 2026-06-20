// DashboardPage — shows current context: permanent plans + active temporada + its plans.

import { useActivePaciente } from '../stores/activePaciente';
import { useCurrentContext } from '../features/plan-temporada/hooks';
import { useMedications } from '../features/medications/hooks';
import { AdherenceChart } from '../features/adherence/AdherenceChart';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { activePacienteId } = useActivePaciente();
  const navigate = useNavigate();
  const { data: context, isLoading: ctxLoading } = useCurrentContext(activePacienteId ?? '');
  const { data: medications, isLoading: medLoading } = useMedications(activePacienteId ?? '');

  if (!activePacienteId) {
    return (
      <div style={styles.empty}>
        <h1 style={styles.title}>Contexto actual</h1>
        <p style={{ color: '#888' }}>Selecciona un paciente para ver su contexto.</p>
        <button onClick={() => navigate('/pacientes')} style={styles.button}>
          Ir a Pacientes
        </button>
      </div>
    );
  }

  if (ctxLoading || medLoading) {
    return <p style={{ color: '#888' }}>Cargando contexto...</p>;
  }


  return (
    <div>
      <h1 style={styles.title}>Contexto actual</h1>

      {context?.activeTemporada && (
        <div style={styles.section}>
          <h2 style={styles.subtitle}>Temporada activa</h2>
          <p style={styles.temporadaName}>{context.activeTemporada.name}</p>
          <p style={styles.temporadaDates}>
            {context.activeTemporada.start_date} → {context.activeTemporada.end_date}
          </p>
        </div>
      )}

      {!context?.activeTemporada && (
        <div style={styles.section}>
          <h2 style={styles.subtitle}>Temporada activa</h2>
          <p style={{ color: '#888' }}>No hay temporada abierta.</p>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.subtitle}>Planes en scope</h2>
        <div style={styles.plansGrid}>
          <div>
            <h3 style={styles.plansSubtitle}>Planes permanentes ({context?.permanentPlans.length ?? 0})</h3>
            {context?.permanentPlans && context.permanentPlans.length > 0 ? (
              <ul style={styles.planList}>
                {context.permanentPlans.map((p) => (
                  <li key={p.id} style={styles.planItem}>
                    <span style={styles.planBadge}>Permanente</span>
                    {p.notes && <span>{p.notes}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#888', fontSize: '0.875rem' }}>Sin planes permanentes.</p>
            )}
          </div>

          <div>
            <h3 style={styles.plansSubtitle}>Planes de temporada ({context?.activePlans.length ?? 0})</h3>
            {context?.activePlans && context.activePlans.length > 0 ? (
              <ul style={styles.planList}>
                {context.activePlans.map((p) => (
                  <li key={p.id} style={styles.planItem}>
                    <span style={styles.planBadge}>Temporada</span>
                    {p.notes && <span>{p.notes}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#888', fontSize: '0.875rem' }}>Sin planes de temporada.</p>
            )}
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subtitle}>Medicamentos en scope ({medications?.length ?? 0})</h2>
        {medications && medications.length > 0 ? (
          <ul style={styles.medList}>
            {medications.filter((m) => m.active).map((m) => (
              <li key={m.id} style={styles.medItem}>
                <span style={styles.medName}>{m.name}</span>
                <span style={styles.medDose}>
                  {m.dose_value} {m.dose_unit === 'other' ? m.dose_unit_other : m.dose_unit}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay medicamentos activos.</p>
        )}
      </div>

      {activePacienteId && (
        <div style={styles.section}>
          <h2 style={styles.subtitle}>Adherencia (últimas 4 semanas)</h2>
          <AdherenceChart pacienteId={activePacienteId} />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { margin: 0, fontSize: '1.5rem', marginBottom: '1rem' },
  section: { marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' },
  subtitle: { margin: '0 0 0.5rem', fontSize: '1.125rem' },
  temporadaName: { fontWeight: 600, fontSize: '1rem' },
  temporadaDates: { fontSize: '0.875rem', color: '#6b7280' },
  plansGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  plansSubtitle: { margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#6b7280' },
  planList: { listStyle: 'none', padding: 0, margin: 0 },
  planItem: { display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.875rem' },
  planBadge: {
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 700,
    background: '#e0f2fe',
    color: '#0369a1',
  },
  medList: { listStyle: 'none', padding: 0, margin: 0 },
  medItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.375rem 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.875rem',
  },
  medName: { fontWeight: 600 },
  medDose: { color: '#6b7280' },
  empty: { textAlign: 'center', padding: '2rem 0' },
  button: {
    padding: '0.5rem 1rem',
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
};
