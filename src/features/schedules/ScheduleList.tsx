// ScheduleList — list of schedules with weekday labels and active toggle.

import type { Schedule } from '../../lib/database.types';
import { useDeactivateSchedule, useReactivateSchedule } from './hooks';

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface ScheduleListProps {
  schedules: Schedule[];
}

export function ScheduleList({ schedules }: ScheduleListProps) {
  const deactivateMutation = useDeactivateSchedule();
  const reactivateMutation = useReactivateSchedule();

  if (schedules.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>No hay horarios registrados.</p>;
  }

  return (
    <ul style={styles.list}>
      {schedules.map((s) => (
        <li key={s.id} style={{ ...styles.item, opacity: s.active ? 1 : 0.5 }}>
          <div style={styles.info}>
            <span style={styles.time}>{s.time_of_day.slice(0, 5)}</span>
            <span style={styles.days}>{formatWeekdays(s.weekday_mask)}</span>
            {!s.active && <span style={styles.inactive}>Inactivo</span>}
          </div>
          <button
            onClick={() => {
              if (s.active) {
                deactivateMutation.mutate(s.id);
              } else {
                reactivateMutation.mutate(s.id);
              }
            }}
            style={s.active ? styles.deactivateBtn : styles.activateBtn}
          >
            {s.active ? 'Desactivar' : 'Activar'}
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatWeekdays(mask: number): string {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    if ((mask & (1 << i)) !== 0) {
      days.push(WEEKDAY_LABELS[i]);
    }
  }
  return days.join(', ');
}

const styles: Record<string, React.CSSProperties> = {
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e5e7eb',
  },
  info: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  time: { fontWeight: 700, fontSize: '1.125rem', fontVariantNumeric: 'tabular-nums' },
  days: { fontSize: '0.875rem', color: '#6b7280' },
  inactive: { fontSize: '0.75rem', color: '#dc2626', fontStyle: 'italic' },
  deactivateBtn: {
    padding: '0.25rem 0.5rem',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  activateBtn: {
    padding: '0.25rem 0.5rem',
    background: '#dcfce7',
    color: '#16a34a',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
};
