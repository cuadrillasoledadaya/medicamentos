// Auth callback page — handles OAuth redirect and session restoration.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message);
        setTimeout(() => navigate('/auth/sign-in', { replace: true }), 2000);
        return;
      }
      if (session) {
        navigate('/', { replace: true });
      } else {
        setError('No se encontró sesión activa.');
        setTimeout(() => navigate('/auth/sign-in', { replace: true }), 2000);
      }
    });
  }, [navigate]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>Error de autenticación</h1>
        <p style={{ color: 'red' }}>{error}</p>
        <p>Redirigiendo al login...</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1>Procesando autenticación...</h1>
      <p>Redirigiendo al dashboard.</p>
    </div>
  );
}

export default AuthCallbackPage;
