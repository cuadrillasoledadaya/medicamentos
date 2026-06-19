// React Query hooks for tomas operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listTomas, listTodayTomas, markTomaTaken, markTomaSkipped, upsertToma } from './api';

export function useTomas(pacienteId: string, dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['tomas', pacienteId, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const { data, error } = await listTomas(pacienteId, dateRange);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useTodayTomas(pacienteId: string) {
  return useQuery({
    queryKey: ['tomas', pacienteId, 'today'],
    queryFn: async () => {
      const { data, error } = await listTodayTomas(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useMarkTomaTaken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tomaId, takenAt }: { tomaId: string; takenAt: string }) =>
      markTomaTaken(tomaId, takenAt),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['tomas', data.paciente_id] });
      }
    },
  });
}

export function useMarkTomaSkipped() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tomaId, reason }: { tomaId: string; reason: string }) =>
      markTomaSkipped(tomaId, reason),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['tomas', data.paciente_id] });
      }
    },
  });
}

export function useUpsertToma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof upsertToma>[0]) => upsertToma(data),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['tomas', data.paciente_id] });
      }
    },
  });
}
