// DayDrawer — sidebar showing tomas for a selected calendar day.

import { useQueryClient } from '@tanstack/react-query';
import { useTomas } from './hooks';
import { useMedications } from '../medications/hooks';
import { IntakeLogger } from './IntakeLogger';
import { statusColor, statusLabel } from './intake';
import type { Medication } from '../../lib/database.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DayDrawerProps {
  pacienteId: string;
  date: Date | null;
  onClose: () => void;
}

export function DayDrawer({ pacienteId, date, onClose }: DayDrawerProps) {
  const queryClient = useQueryClient();

  const startOfDay = date
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
    : new Date();
  const endOfDay = date
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    : new Date();

  const { data: tomas, isLoading } = useTomas(pacienteId, {
    from: startOfDay.toISOString(),
    to: endOfDay.toISOString(),
  });

  const { data: medications } = useMedications(pacienteId);

  if (!date) return null;

  const handleClose = () => {
    queryClient.invalidateQueries({ queryKey: ['tomas'] });
    onClose();
  };

  // Build schedule_id → medication map
  const medMap = new Map<string, Medication>();
  const medsList = medications ?? [];
  for (const med of medsList) {
    medMap.set(med.id, med);
  }

  const dateLabel = format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

  const sortedTomas = (tomas ?? []).sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={handleClose} />

      {/* Drawer panel */}
      <div style={styles.drawer}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>{dateLabel}</h2>
          <button onClick={handleClose} style={styles.closeBtn} aria-label="Cerrar">
            ×
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {isLoading ? (
            <p style={styles.muted}>Cargando tomas...</p>
          ) : sortedTomas.length === 0 ? (
            <p style={styles.muted}>No hay tomas programadas para este día.</p>
          ) : (
            sortedTomas.map((toma) => {
              const schedule = (toma as any).schedules;
              const med = schedule?.medication_id
                ? medMap.get(schedule.medication_id)
                : null;
              const time = format(new Date(toma.scheduled_at), 'HH:mm', { locale: es });

              return (
                <div key={toma.id} style={styles.tomaCard}>
                  <div style={styles.tomaHeader}>
                    <span style={styles.time}>{time}</span>
                    <span style={styles.medName}>{med?.name ?? 'Medicamento'}</span>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: statusColor(toma.status as any),
                      }}
                    >
                      {statusLabel(toma.status as any)}
                    </span>
                  </div>
                  <IntakeLogger toma={toma} onAction={handleClose} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: 'min(400px, 100vw)',
    background: '#fff',
    boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  title: { margin: 0, fontSize: '1.125rem', textTransform: 'capitalize' },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0 0.25rem',
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
  },
  muted: { color: '#6b7280', fontSize: '0.875rem' },
  tomaCard: {
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    padding: '0.75rem',
    marginBottom: '0.75rem',
  },
  tomaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    flexWrap: 'wrap',
  },
  time: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    minWidth: '3rem',
    color: '#0369a1',
    fontSize: '0.875rem',
  },
  medName: { fontWeight: 500, fontSize: '0.875rem', flex: 1 },
  statusBadge: {
    display: 'inline-block',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '0.6875rem',
    fontWeight: 600,
  },
};
