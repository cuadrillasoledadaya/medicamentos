// React Query hooks for retention operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRetentionPolicies, upsertRetentionOverride } from './api';

export function useRetentionPolicies(pacienteId: string) {
  return useQuery({
    queryKey: ['retention', pacienteId],
    queryFn: async () => {
      const { data, error } = await getRetentionPolicies(pacienteId);
      if (error) throw error;
      return data;
    },
    enabled: !!pacienteId,
  });
}

export function useUpsertRetentionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pacienteId, retentionDays }: { pacienteId: string; retentionDays: number }) =>
      upsertRetentionOverride(pacienteId, retentionDays),
    onSuccess: ({ data, error }, variables) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['retention', variables.pacienteId] });
      }
    },
  });
}
