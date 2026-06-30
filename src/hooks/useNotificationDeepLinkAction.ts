// useNotificationDeepLinkAction — fires the matching mutation once on mount
// when the URL contains ?action=taken|snooze|skip, then navigates to /today
// (replacing) to clear the params and prevent re-firing.

import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useMarkTomaTaken, useMarkTomaSkipped } from '@/features/tomas/hooks';

export function useNotificationDeepLinkAction(): {
  status: 'idle' | 'firing' | 'done' | 'error';
} {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const markTaken = useMarkTomaTaken();
  const markSkipped = useMarkTomaSkipped();
  const firedRef = useRef(false);

  const tomaId = searchParams.get('tomaId');
  const action = searchParams.get('action');

  useEffect(() => {
    if (!action || !tomaId || firedRef.current) return;

    firedRef.current = true;

    const fireAction = async () => {
      try {
        switch (action) {
          case 'taken':
            markTaken.mutate({ tomaId, takenAt: new Date().toISOString() });
            break;
          case 'snooze':
            await (supabase.rpc as any)('snooze_toma', { p_toma_id: tomaId });
            break;
          case 'skip':
            markSkipped.mutate({ tomaId, reason: 'notification-skip' });
            break;
          default:
            return;
        }
        navigate('/today', { replace: true });
      } catch {
        // On error, do NOT navigate — let the user retry manually
      }
    };

    fireAction();
  }, [action, tomaId, navigate, markTaken, markSkipped]);

  return { status: action && tomaId ? 'firing' : 'idle' };
}
