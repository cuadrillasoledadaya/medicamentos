// CalendarPage — simple month grid showing tomas density.

import { useState } from 'react';
import { useActivePaciente } from '../stores/activePaciente';
import { useTomas } from '../features/tomas/hooks';
import { statusColor } from '../features/tomas/intake';
import { useNavigate } from 'react-router-dom';

export default function CalendarPage() {
  const { activePacienteId } = useActivePaciente();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const { data: tomas } = useTomas(activePacienteId ?? '', {
    from: startDate.toISOString(),
    to: endDate.toISOString(),
  });

  if (!activePacienteId) {
    return (
      <div style={styles.empty}>
        <h1 style={styles.title}>Calendario</h1>
        <p style={{ color: '#888' }}>Selecciona un paciente para ver el calendario.</p>
        <button onClick={() => navigate('/pacientes')} style={styles.button}>
          Ir a Pacientes
        </button>
      </div>
    );
  }

  // Build calendar grid
  const firstDayOfWeek = startDate.getDay(); // 0=Sun
  const daysInMonth = endDate.getDate();
  const monthName = startDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  // Count tomas per day
  const tomaCountByDay: Record<number, { total: number; statuses: string[] }> = {};
  tomas?.forEach((t) => {
    const day = new Date(t.scheduled_at).getDate();
    if (!tomaCountByDay[day]) {
      tomaCountByDay[day] = { total: 0, statuses: [] };
    }
    tomaCountByDay[day].total++;
    tomaCountByDay[day].statuses.push(t.status);
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div>
      <h1 style={styles.title}>Calendario</h1>

      <div style={styles.nav}>
        <button onClick={prevMonth} style={styles.navBtn}>←</button>
        <span style={styles.monthLabel}>{monthName}</span>
        <button onClick={nextMonth} style={styles.navBtn}>→</button>
      </div>

      <div style={styles.grid}>
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
          <div key={d} style={styles.headerCell}>{d}</div>
        ))}

        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} style={styles.cell} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const tomaData = tomaCountByDay[day];
          return (
            <div key={day} style={{ ...styles.cell, ...styles.dayCell }}>
              <span style={styles.dayNumber}>{day}</span>
              {tomaData && (
                <div style={styles.tomaIndicators}>
                  {tomaData.statuses.slice(0, 4).map((s, idx) => (
                    <span
                      key={idx}
                      style={{
                        ...styles.tomaDot,
                        background: statusColor(s as any),
                      }}
                    />
                  ))}
                  {tomaData.total > 4 && (
                    <span style={styles.more}>+{tomaData.total - 4}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: statusColor('pending') }} /> Pendiente
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: statusColor('taken_on_time') }} /> A tiempo
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: statusColor('taken_late') }} /> Tarde
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: statusColor('missed') }} /> Perdida
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: statusColor('skipped') }} /> Saltada
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { margin: 0, fontSize: '1.5rem', marginBottom: '1rem' },
  nav: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' },
  navBtn: {
    padding: '0.375rem 0.75rem',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  monthLabel: { fontSize: '1.125rem', fontWeight: 600, textTransform: 'capitalize' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    background: '#e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  headerCell: {
    background: '#f9fafb',
    padding: '0.5rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
  },
  cell: {
    background: '#fff',
    minHeight: '60px',
    padding: '0.25rem',
  },
  dayCell: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  dayNumber: { fontSize: '0.75rem', color: '#6b7280' },
  tomaIndicators: { display: 'flex', gap: '2px', flexWrap: 'wrap', marginTop: '0.25rem' },
  tomaDot: { width: '6px', height: '6px', borderRadius: '50%' },
  more: { fontSize: '0.5rem', color: '#6b7280' },
  legend: { display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', fontSize: '0.75rem' },
  legendItem: { display: 'flex', gap: '0.25rem', alignItems: 'center' },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%' },
  empty: { textAlign: 'center', padding: '2rem 0' },
  button: {
    padding: '0.5rem 1rem',
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
};
