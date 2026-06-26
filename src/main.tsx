import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { supabase } from './lib/supabase';
import { AuthProvider } from './features/auth/AuthProvider';
import { setupOutboxReplay } from './features/tomas/outbox';
import {
  setupNotificationMessageHandler,
} from './features/notifications/scheduler';
import { useMarkTomaTaken, useMarkTomaSkipped } from './features/tomas/hooks';
import App from './App';

// Set up outbox replay on online event
setupOutboxReplay();

// Set up notification action handlers (TAKEN, SNOOZE, SKIP from SW)
function NotificationActionHandler() {
  const markTaken = useMarkTomaTaken();
  const markSkipped = useMarkTomaSkipped();

  setupNotificationMessageHandler({
    onTaken: (tomaId) => {
      markTaken.mutate({ tomaId, takenAt: new Date().toISOString() });
    },
    onSnooze: async (tomaId, _minutes) => {
      // Call the snooze_toma RPC to reschedule by 10 minutes
      const { error } = await (supabase.rpc as any)('snooze_toma', {
        p_toma_id: tomaId,
      });
      if (error) {
        console.error('[notif] Snooze RPC failed:', error.message);
      }
    },
    onSkip: (tomaId, reason) => {
      markSkipped.mutate({ tomaId, reason });
    },
  });

  return null;
}

// Request notification permission on first load (after auth is established)
async function initNotifications() {
  // Wait a bit for the app to initialize
  setTimeout(async () => {
    const current = Notification.permission;
    if (current === 'default') {
      // Don't auto-request; let the NotificationPermissionPrompt handle it
      return;
    }
  }, 2000);
}

initNotifications();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationActionHandler />
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
