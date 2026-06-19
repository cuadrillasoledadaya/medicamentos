// MedicationDetailPage — placeholder for now; fully implemented in T-011.

import { useParams, Link } from 'react-router-dom';

export default function MedicationDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <Link to="/medications" style={{ color: '#0ea5e9' }}>← Volver a medicamentos</Link>
      <h1 style={{ marginTop: '1rem' }}>Detalle del medicamento</h1>
      <p>ID: {id}</p>
      <p style={{ color: '#888' }}>Horarios y gestión — próximamente.</p>
    </div>
  );
}
