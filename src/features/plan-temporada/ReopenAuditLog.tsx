// ReopenAuditLog — shows all reopen events for a temporada.

import { useReopenAudit } from './hooks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReopenAuditLogProps {
  temporadaId: string;
}

export function ReopenAuditLog({ temporadaId }: ReopenAuditLogProps) {
  const { data: audits, isLoading } = useReopenAudit(temporadaId);

  if (isLoading) return <p style={styles.loading}>Cargando historial...</p>;
  if (!audits || audits.length === 0) return <p style={styles.empty}>Sin eventos de reapertura.</p>;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Historial de reaperturas</h3>
      <ul style={styles.list}>
        {audits.map((audit: any) => (
          <li key={audit.id} style={styles.item}>
            <div style={styles.meta}>
              <span style={styles.date}>
                {format(new Date(audit.modified_at), 'dd MMM yyyy HH:mm', { locale: es })}
              </span>
              <span style={styles.user}>por {audit.user_id?.slice(0, 8)}...</span>
            </div>
            <p style={styles.reason}>{audit.reason}</p>
            {audit.modified_fields && (
              <pre style={styles.fields}>{JSON.stringify(audit.modified_fields, null, 2)}</pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' },
  title: { margin: '0 0 0.75rem', fontSize: '1rem' },
  loading: { color: '#888', textAlign: 'center', padding: '0.5rem' },
  empty: { color: '#888', textAlign: 'center', padding: '0.5rem' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: { padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' },
  meta: { display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' },
  date: { fontWeight: 600 },
  user: { color: '#9ca3af' },
  reason: { fontSize: '0.8125rem', margin: '0 0 0.25rem' },
  fields: { fontSize: '0.6875rem', background: '#f9fafb', padding: '0.5rem', borderRadius: '4px', overflow: 'auto', maxHeight: '100px' },
};
