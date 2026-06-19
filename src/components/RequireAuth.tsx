// RequireAuth — redirects to /auth/sign-in if no current user.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { LoadingScreen } from './LoadingScreen';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
