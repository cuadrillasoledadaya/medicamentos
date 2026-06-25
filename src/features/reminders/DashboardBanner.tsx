// DashboardBanner — shows today's pending tomas sorted by time.
// Primary fallback for iOS PWA where SW notifications don't work in background.

import { useTodayTomas } from '../tomas/hooks';
import { useMedications } from '../medications/hooks';
import type { Medication } from '../../lib/database.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatusBadge } from './StatusBadge';

interface Props {
  pacienteId: string;
}

export function DashboardBanner({ pacienteId }: Props) {
  const { data: tomas, isLoading: tomasLoading } = useTodayTomas(pacienteId);
  const { data: medications } = useMedications(pacienteId);

  if (tomasLoading) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#888' }}>Cargando recordatorios de hoy...</p>
      </div>
    );
  }

  // Show pending tomas (need to take) and missed tomas (already past and
  // not taken). Taken/skipped are hidden to keep the banner focused on
  // what the user needs to act on. Sorted by scheduled time so the user
  // can scan the day in chronological order.
  const actionableTomas = (tomas ?? [])
    .filter((t) => t.status === 'pending' || t.status === 'missed')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // Build schedule_id → medication map
  const scheduleMedMap = new Map<string, Medication>();
  const medsList = medications ?? [];
  for (const toma of tomas ?? []) {
    const schedule = (toma as any).schedules;
    if (schedule?.medication_id) {
      const med = medsList.find((m) => m.id === schedule.medication_id);
      if (med) scheduleMedMap.set(toma.schedule_id, med);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Recordatorios de hoy</h2>
        <StatusBadge />
      </div>

      {actionableTomas.length === 0 ? (
        <p style={{ color: '#888', fontSize: '0.875rem' }}>
          No hay tomas pendientes para hoy. ¡Todo al día!
        </p>
      ) : (
        <div style={styles.list}>
          {actionableTomas.map((toma) => {
            const med = scheduleMedMap.get(toma.schedule_id);
            const time = format(new Date(toma.scheduled_at), 'HH:mm', { locale: es });
            const isMissed = toma.status === 'missed';

            return (
              <div
                key={toma.id}
                style={{
                  ...styles.item,
                  ...(isMissed ? styles.itemMissed : null),
                }}
              >
                <span style={styles.time}>{time}</span>
                <span style={styles.medName}>
                  {med?.name ?? 'Medicamento'}
                  {med?.dose_value ? ` — ${med.dose_value} ${med.dose_unit === 'other' ? med.dose_unit_other : med.dose_unit}` : ''}
                </span>
                {isMissed && (
                  <span style={styles.missedBadge} title="Dosis perdida — la hora programada ya pasó">
                    Perdida
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  title: { margin: 0, fontSize: '1.125rem' },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    background: '#fff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    fontSize: '0.875rem',
  },
  itemMissed: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
  },
  time: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    minWidth: '3rem',
    color: '#0369a1',
  },
  medName: { fontWeight: 500, flex: 1 },
  missedBadge: {
    padding: '0.125rem 0.5rem',
    background: '#dc2626',
    color: '#fff',
    borderRadius: '999px',
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};
