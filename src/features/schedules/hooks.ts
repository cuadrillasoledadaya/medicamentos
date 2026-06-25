// React Query hooks for schedules operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deactivateSchedule,
  reactivateSchedule,
} from './api';

export function useSchedules(medicationId: string) {
  return useQuery({
    queryKey: ['schedules', medicationId, 'list'],
    queryFn: async () => {
      const { data, error } = await listSchedules(medicationId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!medicationId,
  });
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: async () => {
      const { data, error } = await getSchedule(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof createSchedule>[0]) => createSchedule(input),
    onSuccess: async ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['schedules', data.medication_id, 'list'] });
        // Trigger immediate toma materialization so the user sees tomas
        // in the Dashboard and Calendar without waiting for the 06:00 UTC cron.
        // The RPC is idempotent (ON CONFLICT DO NOTHING) and processes all
        // active schedules, not just this one — that's fine and keeps the
        // schedule grid consistent.
        const { error: rpcError } = await (supabase as any).rpc('materialize_tomas', {
          days_ahead: 7,
        });
        if (rpcError) {
          // Non-fatal: the schedule was created; the daily cron is the
          // fallback. Log so we can spot it in dev.
          // eslint-disable-next-line no-console
          console.warn('materialize_tomas RPC failed (non-fatal):', rpcError.message);
        }
        // Refresh any active tomas query (Dashboard banner, Calendar, Today).
        await queryClient.invalidateQueries({ queryKey: ['tomas'] });
        await queryClient.refetchQueries({ queryKey: ['tomas'] });
      }
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateSchedule>[1] }) =>
      updateSchedule(id, patch),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['schedules', data.medication_id, 'list'] });
      }
    },
  });
}

export function useDeactivateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateSchedule(id),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['schedules', data.medication_id, 'list'] });
      }
    },
  });
}

export function useReactivateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reactivateSchedule(id),
    onSuccess: async ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['schedules', data.medication_id, 'list'] });
        // Reactivating a schedule should immediately regenerate its tomas
        // so the user doesn't have to wait for the next 06:00 UTC cron.
        const { error: rpcError } = await (supabase as any).rpc('materialize_tomas', {
          days_ahead: 7,
        });
        if (rpcError) {
          // eslint-disable-next-line no-console
          console.warn('materialize_tomas RPC failed (non-fatal):', rpcError.message);
        }
        await queryClient.invalidateQueries({ queryKey: ['tomas'] });
        await queryClient.refetchQueries({ queryKey: ['tomas'] });
      }
    },
  });
}
