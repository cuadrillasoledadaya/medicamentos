// React Query hooks for pacientes operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listPacientes, getPaciente, createPaciente, updatePaciente } from './api';

export function usePacientes() {
  return useQuery({
    queryKey: ['pacientes', 'list'],
    queryFn: async () => {
      const { data, error } = await listPacientes();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePaciente(id: string) {
  return useQuery({
    queryKey: ['pacientes', id],
    queryFn: async () => {
      const { data, error } = await getPaciente(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; dob?: string | null; timezone_id?: string }) =>
      createPaciente(input),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['pacientes', 'list'] });
      }
    },
  });
}

export function useUpdatePaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; dob?: string | null; timezone_id?: string; photo_url?: string | null } }) =>
      updatePaciente(id, patch),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['pacientes', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['pacientes', data.id] });
      }
    },
  });
}
