// PDF document factory — creates @react-pdf/renderer documents.
// This file uses JSX and is imported by both the worker and the main thread.

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { ReportData } from '../features/reports/api';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  section: { marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: '3 0' },
  label: { fontSize: 9, color: '#6b7280' },
  value: { fontSize: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: '4 6', fontWeight: 'bold', fontSize: 9 },
  tableRow: { flexDirection: 'row', padding: '4 6', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', fontSize: 9 },
  col1: { flex: 2 },
  col2: { flex: 1 },
  col3: { flex: 1 },
  col4: { flex: 1 },
  col5: { flex: 2 },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
});

const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    taken_on_time: 'Tomada a tiempo',
    taken_late: 'Tomada tarde',
    skipped: 'Saltada',
    missed: 'Perdida',
  };
  return map[status] ?? status;
};

export function createReportDocument(data: ReportData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte de medicación</Text>
        <Text style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
          Generado el {new Date().toLocaleDateString('es-ES')}
        </Text>

        {/* Paciente info */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Paciente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{data.paciente.name}</Text>
          </View>
          {data.paciente.dob && (
            <View style={styles.row}>
              <Text style={styles.label}>Fecha de nacimiento:</Text>
              <Text style={styles.value}>{new Date(data.paciente.dob).toLocaleDateString('es-ES')}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Zona horaria:</Text>
            <Text style={styles.value}>{data.paciente.timezone_id}</Text>
          </View>
        </View>

        {/* Active medications */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Medicamentos activos ({data.medications.length})</Text>
          {data.medications.map((med) => (
            <View key={med.id} style={styles.row}>
              <Text style={styles.value}>{med.name}</Text>
              <Text style={styles.value}>
                {med.dose_value} {med.dose_unit} — {med.route}
              </Text>
            </View>
          ))}
        </View>

        {/* Schedules */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Horarios ({data.schedules.length})</Text>
          {data.schedules.map((s: any) => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.value}>{s.medication_name}</Text>
              <Text style={styles.value}>{s.time_of_day}</Text>
            </View>
          ))}
        </View>

        {/* Tomas table */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Tomas ({data.dateRange.from} → {data.dateRange.to})</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Fecha</Text>
            <Text style={styles.col2}>Medicamento</Text>
            <Text style={styles.col3}>Hora</Text>
            <Text style={styles.col4}>Estado</Text>
            <Text style={styles.col5}>Notas</Text>
          </View>
          {data.tomas.map((toma) => (
            <View key={toma.id} style={styles.tableRow}>
              <Text style={styles.col1}>{new Date(toma.scheduled_at).toLocaleDateString('es-ES')}</Text>
              <Text style={styles.col2}>—</Text>
              <Text style={styles.col3}>{new Date(toma.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Text>
              <Text style={styles.col4}>{statusLabel(toma.status)}</Text>
              <Text style={styles.col5}>{toma.notes ?? ''}</Text>
            </View>
          ))}
        </View>

        {/* Adherence summary */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Adherencia diaria</Text>
          {data.adherence.filter((a) => a.adherence_pct !== null).map((a, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.value}>{a.date}</Text>
              <Text style={styles.value}>{(a.adherence_pct! * 100).toFixed(0)}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Medicamentos PWA — Reporte generado automáticamente
        </Text>
      </Page>
    </Document>
  );
}
