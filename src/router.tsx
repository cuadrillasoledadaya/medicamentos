// React Router v6 setup with lazy routes, Suspense, and auth guards.

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoadingScreen } from './components/LoadingScreen';
import { NotFoundPage } from './components/NotFoundPage';
import { RequireAuth } from './components/RequireAuth';

// Lazy-loaded pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PacientesPage = lazy(() => import('./pages/PacientesPage'));
const MedicationsPage = lazy(() => import('./pages/MedicationsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MedicationDetailPage = lazy(() => import('./pages/MedicationDetailPage'));
const AdherencePage = lazy(() => import('./features/adherence/routes'));
const InteractionsPage = lazy(() => import('./features/interactions/routes'));
const StockPage = lazy(() => import('./features/stock/routes'));

// Auth pages (eager — small and needed for auth flow)
import { SignInPage } from './features/auth/SignInPage';
import { SignUpPage } from './features/auth/SignUpPage';
import { AuthCallbackPage } from './features/auth/AuthCallbackPage';

function SuspenseWrapper(children: React.ReactNode) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
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
        path: '/pacientes/new',
        element: SuspenseWrapper(<PacientesPage />),
      },
      {
        path: '/medications',
        element: SuspenseWrapper(<MedicationsPage />),
      },
      {
        path: '/medications/:id',
        element: SuspenseWrapper(<MedicationDetailPage />),
      },
      {
        path: '/calendar',
        element: SuspenseWrapper(<CalendarPage />),
      },
      {
        path: '/settings',
        element: SuspenseWrapper(<SettingsPage />),
      },
      {
        path: '/adherence',
        element: SuspenseWrapper(<AdherencePage />),
      },
      {
        path: '/admin/interactions',
        element: SuspenseWrapper(<InteractionsPage />),
      },
      {
        path: '/stock',
        element: SuspenseWrapper(<StockPage />),
      },
    ],
  },
  // Auth routes (outside AppShell, no auth required)
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
  // Redirect old paths
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
