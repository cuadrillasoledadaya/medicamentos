// Report form — date range picker + generate PDF + share link.

import { useState } from 'react';
import { useGenerateReport, useUploadShareLink } from './hooks';
import { createReportDocument } from '../../workers/pdf-document-factory';
import { pdf } from '@react-pdf/renderer';

interface ReportFormProps {
  pacienteId: string;
}

export function ReportForm({ pacienteId }: ReportFormProps) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const [dateFrom, setDateFrom] = useState(weekAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const uploadMutation = useUploadShareLink();

  const { data: reportData, isLoading, error } = useGenerateReport(pacienteId, dateFrom, dateTo);

  const handleGeneratePDF = async () => {
    if (!reportData) return;
    setPdfGenerating(true);
    try {
      // Main-thread PDF generation (worker fallback if needed)
      const doc = createReportDocument(reportData);
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${pacienteId}-${dateFrom}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('PDF generation failed:', e);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!reportData) return;
    uploadMutation.mutate(reportData, {
      onSuccess: ({ data, error }) => {
        if (!error && data) {
          setShareUrl(data.signedUrl);
        }
      },
    });
  };

  return (
    <div style={styles.container}>
      {/* Date range */}
      <div style={styles.dateRow}>
        <div style={styles.field}>
          <label style={styles.label}>Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={styles.input}
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <p style={styles.loading}>Generando datos del reporte...</p>}

      {/* Error state */}
      {error && <p style={styles.error}>{error.message}</p>}

      {/* Actions */}
      {reportData && (
        <div style={styles.actions}>
          <button
            onClick={handleGeneratePDF}
            disabled={pdfGenerating}
            style={styles.primaryBtn}
          >
            {pdfGenerating ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
          <button
            onClick={handleGenerateShareLink}
            disabled={uploadMutation.isPending}
            style={styles.secondaryBtn}
          >
            {uploadMutation.isPending ? 'Generando enlace...' : 'Generar enlace compartido'}
          </button>
        </div>
      )}

      {/* Share link result */}
      {shareUrl && (
        <div style={styles.shareResult}>
          <p style={styles.shareLabel}>Enlace compartido (válido por 7 días):</p>
          <input
            readOnly
            value={shareUrl}
            style={styles.shareInput}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            style={styles.copyBtn}
          >
            Copiar
          </button>
        </div>
      )}

      {/* Summary */}
      {reportData && (
        <div style={styles.summary}>
          <p><strong>{reportData.medications.length}</strong> medicamentos activos</p>
          <p><strong>{reportData.schedules.length}</strong> horarios</p>
          <p><strong>{reportData.tomas.length}</strong> tomas en el período</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem' },
  dateRow: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { fontSize: '0.8125rem', fontWeight: 600, color: '#374151' },
  input: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' },
  loading: { color: '#888', textAlign: 'center', padding: '1rem' },
  error: { color: '#dc2626', padding: '0.5rem' },
  actions: { display: 'flex', gap: '0.75rem', marginBottom: '1rem' },
  primaryBtn: {
    padding: '0.625rem 1rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  secondaryBtn: {
    padding: '0.625rem 1rem',
    background: '#e0f2fe',
    color: '#0369a1',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  shareResult: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' },
  shareLabel: { fontSize: '0.8125rem', fontWeight: 600, margin: '0 0 0.5rem' },
  shareInput: { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '0.5rem' },
  copyBtn: {
    padding: '0.375rem 0.75rem',
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  summary: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' },
};
