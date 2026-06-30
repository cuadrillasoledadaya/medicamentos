// IntakeActionModal — iOS deep-link fallback modal for push notification actions.
// Renders 3 buttons (taken/snooze/skip) wired to existing mutations.
// Follows DayDrawer.tsx visual pattern: backdrop z-999, panel z-1000.

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useMarkTomaTaken, useMarkTomaSkipped } from '@/features/tomas/hooks';

interface IntakeActionModalProps {
  tomaId: string;
  open: boolean;
  onClose: () => void;
}

export function IntakeActionModal({ tomaId, open, onClose }: IntakeActionModalProps) {
  const markTaken = useMarkTomaTaken();
  const markSkipped = useMarkTomaSkipped();
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleTaken = () => {
    markTaken.mutate({ tomaId, takenAt: new Date().toISOString() });
    onClose();
  };

  const handleSnooze = async () => {
    setLoading(true);
    await (supabase.rpc as any)('snooze_toma', { p_toma_id: tomaId });
    setLoading(false);
    onClose();
  };

  const handleSkip = () => {
    markSkipped.mutate({ tomaId, reason: 'notification-skip' });
    onClose();
  };

  return (
    <div style={styles.backdrop} onClick={onClose} data-testid="modal-backdrop">
      <div style={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 style={styles.title}>¿Qué querés hacer con esta toma?</h3>
        <div style={styles.buttons}>
          <button style={styles.button} onClick={handleTaken}>
            Marcar como tomada
          </button>
          <button style={styles.button} onClick={handleSnooze} disabled={loading}>
            {loading ? 'Posponiendo...' : 'Posponer 10 min'}
          </button>
          <button style={styles.button} onClick={handleSkip}>
            Saltar
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  panel: {
    background: '#fff',
    borderRadius: '12px 12px 0 0',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '400px',
    zIndex: 1000,
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
    textAlign: 'center',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  button: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    background: '#fff',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
