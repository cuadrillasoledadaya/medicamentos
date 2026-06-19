// React Router v6 setup with lazy routes and Suspense.

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoadingScreen } from './components/LoadingScreen';
import { NotFoundPage } from './components/NotFoundPage';

// Lazy-loaded pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const PacientesPage = lazy(() => import('./pages/PacientesPage'));
const MedicationsPage = lazy(() => import('./pages/MedicationsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function SuspenseWrapper(children: React.ReactNode) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <NotFoundPage />,
    children: [
      {
        path: '/',
        element: SuspenseWrapper(<DashboardPage />),
      },
      {
        path: '/pacientes',
        element: SuspenseWrapper(<PacientesPage />),
      },
      {
        path: '/medications',
        element: SuspenseWrapper(<MedicationsPage />),
      },
      {
        path: '/calendar',
        element: SuspenseWrapper(<CalendarPage />),
      },
      {
        path: '/settings',
        element: SuspenseWrapper(<SettingsPage />),
      },
    ],
  },
  // Auth routes (outside AppShell)
  {
    path: '/auth/sign-in',
    element: SuspenseWrapper(<SignInPage />),
  },
  {
    path: '/auth/sign-up',
    element: SuspenseWrapper(<SignUpPage />),
  },
  {
    path: '/auth/callback',
    element: SuspenseWrapper(<AuthCallbackPage />),
  },
  // Redirect old /login to /auth/sign-in
  {
    path: '/login',
    element: <Navigate to="/auth/sign-in" replace />,
  },
  // Catch-all
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
