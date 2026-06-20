// ShareViewer — read-only viewer for shared report links (no auth required).
// Renders the JSON report data in a simple format.

import { useParams } from 'react-router-dom';
import { useSharedReport } from './hooks';

export function ShareViewer() {
  const { token } = useParams<{ token: string }>();
  // token is the signed URL (passed as a path param or query string)
  const signedUrl = token ? decodeURIComponent(token) : '';
  const { data, isLoading, error } = useSharedReport(signedUrl);

  if (isLoading) return <p style={styles.loading}>Cargando reporte compartido...</p>;
  if (error) return <p style={styles.error}>Error al cargar el reporte: {error.message}</p>;
  if (!data) return <p style={styles.error}>Reporte no encontrado o enlace expirado.</p>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Reporte de medicación</h1>
      <p style={styles.subtitle}>Paciente: {data.paciente.name}</p>
      <p style={styles.subtitle}>Período: {data.dateRange.from} → {data.dateRange.to}</p>

      {/* Medications */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Medicamentos activos</h2>
        <ul style={styles.list}>
          {data.medications.map((med) => (
            <li key={med.id}>
              <strong>{med.name}</strong> — {med.dose_value} {med.dose_unit} ({med.route})
            </li>
          ))}
        </ul>
      </div>

      {/* Tomas summary */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Tomas registradas ({data.tomas.length})</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Notas</th>
            </tr>
          </thead>
          <tbody>
            {data.tomas.slice(0, 50).map((toma) => (
              <tr key={toma.id}>
                <td style={styles.td}>{new Date(toma.scheduled_at).toLocaleDateString('es-ES')}</td>
                <td style={styles.td}>{toma.status.replace(/_/g, ' ')}</td>
                <td style={styles.td}>{toma.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.tomas.length > 50 && (
          <p style={styles.note}>Mostrando las primeras 50 de {data.tomas.length} tomas.</p>
        )}
      </div>

      {/* Adherence */}
      {data.adherence.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Adherencia diaria</h2>
          {data.adherence.filter((a) => a.adherence_pct !== null).map((a, i) => (
            <div key={i} style={styles.adherenceRow}>
              <span>{a.date}</span>
              <span style={{ fontWeight: 600 }}>{(a.adherence_pct! * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      <p style={styles.footer}>
        Reporte compartido desde Medicamentos PWA — enlace válido por 7 días
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' },
  title: { fontSize: '1.5rem', marginBottom: '0.5rem' },
  subtitle: { fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.25rem' },
  loading: { color: '#888', textAlign: 'center', padding: '2rem' },
  error: { color: '#dc2626', textAlign: 'center', padding: '2rem' },
  section: { marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1.125rem', marginBottom: '0.5rem' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '0.5rem', borderBottom: '2px solid #e5e7eb', fontSize: '0.8125rem', fontWeight: 600 },
  td: { padding: '0.5rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem' },
  note: { fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' },
  adherenceRow: { display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.875rem' },
  footer: { fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' as const, marginTop: '2rem' },
};
