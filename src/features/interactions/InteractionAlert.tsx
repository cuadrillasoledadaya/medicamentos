// InteractionAlert — shows warnings when adding a medication with known interactions.

import type { Interaction } from '../../lib/database.types';

interface InteractionAlertProps {
  interactions: Interaction[];
  onDismiss?: () => void;
}

export function InteractionAlert({ interactions, onDismiss }: InteractionAlertProps) {
  if (interactions.length === 0) return null;

  const severityColor: Record<string, string> = {
    info: '#3b82f6',
    caution: '#eab308',
    warning: '#f97316',
    severe: '#dc2626',
  };

  const severityBg: Record<string, string> = {
    info: '#eff6ff',
    caution: '#fefce8',
    warning: '#fff7ed',
    severe: '#fef2f2',
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>⚠️</span>
        <span style={styles.title}>
          {interactions.length === 1
            ? 'Interacción detectada'
            : `${interactions.length} interacciones detectadas`}
        </span>
        {onDismiss && (
          <button onClick={onDismiss} style={styles.dismissBtn}>✕</button>
        )}
      </div>
      {interactions.map((interaction) => (
        <div
          key={interaction.id}
          style={{
            ...styles.alertItem,
            background: severityBg[interaction.severity] ?? '#f9fafb',
            borderLeft: `3px solid ${severityColor[interaction.severity] ?? '#888'}`,
          }}
        >
          <div style={styles.pairRow}>
            <span style={styles.pair}>
              {interaction.drug_a} ↔ {interaction.drug_b}
            </span>
            <span style={{
              ...styles.severityBadge,
              background: severityColor[interaction.severity],
              color: '#fff',
            }}>
              {interaction.severity}
            </span>
          </div>
          <p style={styles.description}>{interaction.description}</p>
          {interaction.source_notes && (
            <span style={styles.source}>Fuente: {interaction.source_notes}</span>
          )}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' },
  header: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fef2f2', borderBottom: '1px solid #e5e7eb' },
  icon: { fontSize: '1.125rem' },
  title: { fontWeight: 700, fontSize: '0.875rem', color: '#dc2626', flex: 1 },
  dismissBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#9ca3af', padding: '0 0.25rem' },
  alertItem: { padding: '0.75rem 1rem' },
  pairRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' },
  pair: { fontWeight: 600, fontSize: '0.875rem' },
  severityBadge: { padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 700 },
  description: { fontSize: '0.8125rem', color: '#374151', margin: '0 0 0.25rem' },
  source: { fontSize: '0.75rem', color: '#9ca3af' },
};
