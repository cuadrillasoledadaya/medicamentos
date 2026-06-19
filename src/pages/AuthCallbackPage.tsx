import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Will be wired to supabase.auth.getSession() in T-007
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1>Procesando autenticación...</h1>
      <p>Redirigiendo al dashboard.</p>
    </div>
  );
}

export default AuthCallbackPage;
