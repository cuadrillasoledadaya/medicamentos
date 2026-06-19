// IntakeLogger — UI for marking a toma as taken, skipped, or snoozed.

import { useState } from 'react';
import { useMarkTomaTaken, useMarkTomaSkipped } from './hooks';
import type { Toma } from '../../lib/database.types';
import { statusLabel, statusColor } from './intake';

interface IntakeLoggerProps {
  toma: Toma;
  onAction?: () => void;
}

export function IntakeLogger({ toma, onAction }: IntakeLoggerProps) {
  const [showSkipReason, setShowSkipReason] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState('');

  const takenMutation = useMarkTomaTaken();
  const skipMutation = useMarkTomaSkipped();

  const handleTaken = async () => {
    const takenAt = useCustomTime && customTime
      ? new Date(customTime).toISOString()
      : new Date().toISOString();

    const result = await takenMutation.mutateAsync({ tomaId: toma.id, takenAt });
    if (!result.error) onAction?.();
  };

  const handleSkip = async () => {
    if (!skipReason.trim()) return;
    const result = await skipMutation.mutateAsync({ tomaId: toma.id, reason: skipReason });
    if (!result.error) onAction?.();
  };

  if (showSkipReason) {
    return (
      <div style={styles.container}>
        <input
          type="text"
          value={skipReason}
          onChange={(e) => setSkipReason(e.target.value)}
          placeholder="Razón para saltar"
          style={styles.input}
        />
        <div style={styles.actions}>
          <button onClick={handleSkip} style={styles.confirmBtn} disabled={!skipReason.trim()}>
            Confirmar
          </button>
          <button onClick={() => setShowSkipReason(false)} style={styles.cancelBtn}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{ ...styles.statusBadge, background: statusColor(toma.status) }}>
        {statusLabel(toma.status)}
      </div>

      {toma.status === 'pending' && (
        <>
          <div style={styles.timeToggle}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={useCustomTime}
                onChange={(e) => setUseCustomTime(e.target.checked)}
              />
              Usar hora personalizada
            </label>
            {useCustomTime && (
              <input
                type="datetime-local"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                style={styles.input}
              />
            )}
          </div>

          <div style={styles.actions}>
            <button onClick={handleTaken} style={styles.takenBtn}>
              Marcar como tomada
            </button>
            <button onClick={() => setShowSkipReason(true)} style={styles.skipBtn}>
              Saltar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0' },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    width: 'fit-content',
  },
  timeToggle: { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' },
  checkboxLabel: { display: 'flex', gap: '0.25rem', alignItems: 'center', cursor: 'pointer' },
  input: {
    padding: '0.375rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  actions: { display: 'flex', gap: '0.5rem' },
  takenBtn: {
    padding: '0.375rem 0.75rem',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  skipBtn: {
    padding: '0.375rem 0.75rem',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  confirmBtn: {
    padding: '0.375rem 0.75rem',
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  cancelBtn: {
    padding: '0.375rem 0.75rem',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
};
