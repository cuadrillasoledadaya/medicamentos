// React Query hooks for schedules operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['schedules', data.medication_id, 'list'] });
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
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['schedules', data.medication_id, 'list'] });
      }
    },
  });
}
