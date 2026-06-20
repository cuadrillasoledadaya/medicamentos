// React Query hooks for travel operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updatePacienteTimezone, createTripAdjustment, listTripAdjustments } from './api';

export function useUpdatePacienteTimezone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pacienteId, timezoneId }: { pacienteId: string; timezoneId: string }) =>
      updatePacienteTimezone(pacienteId, timezoneId),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      }
    },
  });
}

export function useTripAdjustments(pacienteId: string) {
  return useQuery({
    queryKey: ['travel', pacienteId, 'adjustments'],
    queryFn: async () => {
      const { data, error } = await listTripAdjustments(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useCreateTripAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof createTripAdjustment>[0]) => createTripAdjustment(input),
    onSuccess: ({ data, error }, variables) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['travel', variables.paciente_id, 'adjustments'] });
      }
    },
  });
}
