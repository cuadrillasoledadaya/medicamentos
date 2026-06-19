// FamilyPanel — UI to manage family members for a paciente.

import { useFamilyMembers, useRevokeFamilyMember } from './hooks';

const ROLE_LABELS: Record<string, string> = {
  owner_paciente: 'Paciente (dueño)',
  cuidador_principal: 'Cuidador principal',
  cuidador_secundario: 'Cuidador secundario',
  medico: 'Médico',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  revoked: 'Revocado',
};

interface FamilyPanelProps {
  pacienteId: string;
}

export function FamilyPanel({ pacienteId }: FamilyPanelProps) {
  const { data: members, isLoading } = useFamilyMembers(pacienteId);
  const revokeMutation = useRevokeFamilyMember();

  if (isLoading) return <p style={{ color: '#888' }}>Cargando familiares...</p>;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Familiares</h3>
      <p style={styles.note}>
        Invitar familiar — próximamente (requiere Edge Function para resolver email a usuario).
      </p>

      {members && members.length > 0 ? (
        <ul style={styles.list}>
          {members.map((m) => (
            <li key={m.id} style={styles.item}>
              <div style={styles.info}>
                <span style={styles.role}>{ROLE_LABELS[m.role] ?? m.role}</span>
                <span style={styles.status}>{STATUS_LABELS[m.status] ?? m.status}</span>
                <span style={styles.userId}>User: {m.user_id.slice(0, 8)}...</span>
              </div>
              {m.status === 'active' && m.role !== 'owner_paciente' && (
                <button
                  onClick={() => revokeMutation.mutate(m.id)}
                  style={styles.revokeBtn}
                  disabled={revokeMutation.isPending}
                >
                  Revocar
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay familiares registrados.</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { marginTop: '1.5rem' },
  title: { fontSize: '1rem', marginBottom: '0.5rem' },
  note: { fontSize: '0.75rem', color: '#888', marginBottom: '1rem' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e5e7eb',
  },
  info: { display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem' },
  role: { fontWeight: 600 },
  status: { color: '#6b7280' },
  userId: { color: '#9ca3af', fontSize: '0.75rem' },
  revokeBtn: {
    padding: '0.25rem 0.5rem',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
};
