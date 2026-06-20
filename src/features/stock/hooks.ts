// React Query hooks for stock operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLowStockMedications, adjustStockWithReason } from './api';

export function useLowStockMedications(pacienteId: string) {
  return useQuery({
    queryKey: ['stock', pacienteId, 'low'],
    queryFn: async () => {
      const { data, error } = await getLowStockMedications(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ medicationId, newEstimate, reason }: {
      medicationId: string;
      newEstimate: number;
      reason: string;
    }) => adjustStockWithReason(medicationId, newEstimate, reason),
    onSuccess: ({ data }) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['medications', data.paciente_id] });
        queryClient.invalidateQueries({ queryKey: ['stock'] });
      }
    },
  });
}
