// React Query hooks for plan-temporada operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listTemporadas,
  getTemporada,
  createTemporada,
  closeTemporada,
  listPlans,
  createPlan,
  getCurrentContext,
  reopenTemporada,
  listReopenAudit,
} from './api';

export function useTemporadas(pacienteId: string) {
  return useQuery({
    queryKey: ['temporadas', pacienteId, 'list'],
    queryFn: async () => {
      const { data, error } = await listTemporadas(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useTemporada(id: string) {
  return useQuery({
    queryKey: ['temporadas', id],
    queryFn: async () => {
      const { data, error } = await getTemporada(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTemporada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof createTemporada>[0]) => createTemporada(input),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['temporadas', data.paciente_id, 'list'] });
      }
    },
  });
}

export function useCloseTemporada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => closeTemporada(id),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['temporadas', data.paciente_id, 'list'] });
      }
    },
  });
}

export function usePlans(pacienteId: string) {
  return useQuery({
    queryKey: ['plans', pacienteId, 'list'],
    queryFn: async () => {
      const { data, error } = await listPlans(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof createPlan>[0]) => createPlan(input),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['plans', data.paciente_id, 'list'] });
      }
    },
  });
}

export function useCurrentContext(pacienteId: string) {
  return useQuery({
    queryKey: ['current-context', pacienteId],
    queryFn: async () => {
      const { data, error } = await getCurrentContext(pacienteId);
      if (error) throw error;
      return data;
    },
    enabled: !!pacienteId,
  });
}

export function useReopenTemporada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ temporadaId, reason }: { temporadaId: string; reason: string }) =>
      reopenTemporada(temporadaId, reason),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['temporadas'] });
      }
    },
  });
}

export function useReopenAudit(temporadaId: string) {
  return useQuery({
    queryKey: ['temporada-reopen-audit', temporadaId],
    queryFn: async () => {
      const { data, error } = await listReopenAudit(temporadaId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!temporadaId,
  });
}
