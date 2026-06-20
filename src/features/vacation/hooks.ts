// React Query hooks for vacation operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listVacations, createVacation, cancelVacation, deleteVacation } from './api';
import type { VacationInput } from './api';

export function useVacations(pacienteId: string) {
  return useQuery({
    queryKey: ['vacations', pacienteId, 'list'],
    queryFn: async () => {
      const { data, error } = await listVacations(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useCreateVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: VacationInput) => createVacation(input),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['vacations', data.paciente_id, 'list'] });
      }
    },
  });
}

export function useCancelVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vacationId: string) => cancelVacation(vacationId),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['vacations', data.paciente_id, 'list'] });
      }
    },
  });
}

export function useDeleteVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vacationId: string) => deleteVacation(vacationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
    },
  });
}
