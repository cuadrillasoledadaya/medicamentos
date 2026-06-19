// 404 page for unmatched routes.

import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>404</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Página no encontrada
      </p>
      <Link to="/" style={{ color: '#0ea5e9', textDecoration: 'underline' }}>
        Volver al inicio
      </Link>
    </div>
  );
}
