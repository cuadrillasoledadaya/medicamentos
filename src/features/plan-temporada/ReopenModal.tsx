// ReopenModal — captures reason for reopening a closed temporada > 90 days old.

import { useState } from 'react';
import { useReopenTemporada } from './hooks';

interface ReopenModalProps {
  temporadaId: string;
  temporadaName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReopenModal({ temporadaId, temporadaName, onClose, onSuccess }: ReopenModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const reopenMutation = useReopenTemporada();

  const handleSubmit = () => {
    if (reason.length < 10) {
      setError('El motivo debe tener al menos 10 caracteres.');
      return;
    }
    setError(null);
    reopenMutation.mutate({ temporadaId, reason }, {
      onSuccess: ({ error }) => {
        if (!error) {
          onSuccess();
        }
      },
    });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Reabrir temporada</h2>
        <p style={styles.subtitle}>
          "{temporadaName}" está cerrada hace más de 90 días.
          Para modificarla, debes proporcionar un motivo.
        </p>

        <div style={styles.field}>
          <label style={styles.label}>Motivo (mínimo 10 caracteres)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            style={styles.textarea}
            placeholder="Ej: se cerró por error, faltan tomas por registrar..."
          />
          <p style={styles.charCount}>{reason.length}/10 mínimo</p>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {reopenMutation.error && <p style={styles.error}>{reopenMutation.error.message}</p>}

        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={reopenMutation.isPending}
            style={styles.submitBtn}
          >
            {reopenMutation.isPending ? 'Reabriendo...' : 'Reabrir temporada'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    maxWidth: '480px',
    width: '90%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  title: { margin: '0 0 0.5rem', fontSize: '1.25rem' },
  subtitle: { fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1rem' },
  field: { marginBottom: '1rem' },
  label: { fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' },
  textarea: { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' as const },
  charCount: { fontSize: '0.6875rem', color: '#9ca3af', margin: '0.25rem 0 0' },
  error: { fontSize: '0.8125rem', color: '#dc2626', margin: '0 0 0.5rem' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' },
  cancelBtn: {
    padding: '0.5rem 1rem',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  submitBtn: {
    padding: '0.5rem 1rem',
    background: '#f59e0b',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
};
