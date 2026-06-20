// AdherenceChart — 4-week bar chart with green/yellow/red bands.

import { useAdherence28d, useWeeklyAdherenceAverage } from './hooks';

interface AdherenceChartProps {
  pacienteId: string;
}

export function AdherenceChart({ pacienteId }: AdherenceChartProps) {
  const { data: dailyData, isLoading } = useAdherence28d(pacienteId);
  const { data: weeklyAvg } = useWeeklyAdherenceAverage(pacienteId);

  if (isLoading) {
    return <p style={{ color: '#888' }}>Cargando adherencia...</p>;
  }

  if (!dailyData || dailyData.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ color: '#888' }}>Sin datos de adherencia en los últimos 28 días.</p>
        <p style={{ fontSize: '0.75rem', color: '#aaa' }}>
          Los datos aparecerán cuando se registren tomas.
        </p>
      </div>
    );
  }

  const daysWithData = dailyData.filter((d) => d.adherence_pct !== null);
  if (daysWithData.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ color: '#888' }}>No hay tomas registradas en los últimos 28 días.</p>
      </div>
    );
  }

  const barColor = (pct: number | null): string => {
    if (pct === null) return '#e5e7eb';
    if (pct >= 0.8) return '#22c55e'; // green
    if (pct >= 0.5) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  // Group by week for the 4-week bar chart
  const weeks = [1, 2, 3, 4];
  const weekBars = weeks.map((w) => {
    const weekData = weeklyAvg?.find((wa) => wa.week === w);
    return {
      week: w,
      avg: weekData?.avg_pct ?? null,
    };
  });

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Adherencia — Últimas 4 semanas</h3>

      {/* Weekly average bars */}
      <div style={styles.weeklyBars}>
        {weekBars.map((bar) => (
          <div key={bar.week} style={styles.barWrapper}>
            <span style={styles.barLabel}>Sem {bar.week}</span>
            <div style={styles.barTrack}>
              <div
                style={{
                  ...styles.barFill,
                  width: `${(bar.avg ?? 0) * 100}%`,
                  background: barColor(bar.avg),
                }}
              />
            </div>
            <span style={styles.barValue}>
              {bar.avg !== null ? `${Math.round(bar.avg * 100)}%` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#22c55e' }} /> ≥80%
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#eab308' }} /> 50-79%
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#ef4444' }} /> &lt;50%
        </span>
      </div>

      {/* Overall summary */}
      {daysWithData.length > 0 && (
        <div style={styles.summary}>
          <span style={styles.summaryLabel}>Promedio general:</span>
          <span style={{
            ...styles.summaryValue,
            color: barColor(
              daysWithData.reduce((s, d) => s + (d.adherence_pct ?? 0), 0) / daysWithData.length
            ),
          }}>
            {Math.round(
              (daysWithData.reduce((s, d) => s + (d.adherence_pct ?? 0), 0) / daysWithData.length) * 100
            )}%
          </span>
          <span style={styles.summaryDays}>({daysWithData.length} días con datos)</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', background: '#f9fafb', borderRadius: '8px' },
  title: { margin: '0 0 1rem', fontSize: '1rem', color: '#374151' },
  weeklyBars: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' },
  barWrapper: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  barLabel: { fontSize: '0.75rem', color: '#6b7280', width: '3.5rem', textAlign: 'right' },
  barTrack: {
    flex: 1,
    height: '1.25rem',
    background: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  barValue: { fontSize: '0.75rem', fontWeight: 600, width: '3rem' },
  legend: { display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#6b7280' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.25rem' },
  legendDot: { display: 'inline-block', width: '0.625rem', height: '0.625rem', borderRadius: '50%' },
  summary: { display: 'flex', alignItems: 'baseline', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' },
  summaryLabel: { fontSize: '0.875rem', color: '#6b7280' },
  summaryValue: { fontSize: '1.25rem', fontWeight: 700 },
  summaryDays: { fontSize: '0.75rem', color: '#9ca3af' },
  empty: { padding: '1.5rem', textAlign: 'center', background: '#f9fafb', borderRadius: '8px' },
};
