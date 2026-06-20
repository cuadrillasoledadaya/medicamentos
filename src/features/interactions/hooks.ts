// React Query hooks for interactions.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listInteractions,
  getInteraction,
  createInteraction,
  updateInteraction,
  deleteInteraction,
  checkInteractionForMedication,
  checkTemporalConflicts,
} from './api';

export function useInteractions() {
  return useQuery({
    queryKey: ['interactions', 'list'],
    queryFn: async () => {
      const { data, error } = await listInteractions();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInteraction(id: string) {
  return useQuery({
    queryKey: ['interactions', id],
    queryFn: async () => {
      const { data, error } = await getInteraction(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createInteraction>[0]) => createInteraction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
    },
  });
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateInteraction>[1] }) =>
      updateInteraction(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInteraction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
    },
  });
}

export function useCheckInteraction(medicationName: string, activeNames: string[]) {
  return useQuery({
    queryKey: ['interactions', 'check', medicationName, activeNames],
    queryFn: async () => {
      const { data, error } = await checkInteractionForMedication(medicationName, activeNames);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!medicationName && activeNames.length > 0,
  });
}

export function useCheckTemporalConflicts(
  pacienteId: string,
  scheduleTimeOfDay: string,
  medicationId: string,
) {
  return useQuery({
    queryKey: ['interactions', 'temporal', pacienteId, scheduleTimeOfDay, medicationId],
    queryFn: async () => {
      const { data, error } = await checkTemporalConflicts(pacienteId, scheduleTimeOfDay, medicationId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId && !!scheduleTimeOfDay && !!medicationId,
  });
}
