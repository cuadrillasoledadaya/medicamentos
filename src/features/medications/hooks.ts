// React Query hooks for medications operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMedications,
  getMedication,
  createMedication,
  updateMedication,
  archiveMedication,
  uploadPhoto,
} from './api';

export function useMedications(pacienteId: string) {
  return useQuery({
    queryKey: ['medications', pacienteId, 'list'],
    queryFn: async () => {
      const { data, error } = await listMedications(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useMedication(id: string) {
  return useQuery({
    queryKey: ['medications', id],
    queryFn: async () => {
      const { data, error } = await getMedication(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof createMedication>[0]) => createMedication(input),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['medications', data.paciente_id, 'list'] });
      }
    },
  });
}

export function useUpdateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateMedication>[1] }) =>
      updateMedication(id, patch),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['medications', data.paciente_id, 'list'] });
        queryClient.invalidateQueries({ queryKey: ['medications', data.id] });
      }
    },
  });
}

export function useArchiveMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveMedication(id),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['medications', data.paciente_id, 'list'] });
      }
    },
  });
}

export function useUploadPhoto() {
  return useMutation({
    mutationFn: ({ medicationId, file }: { medicationId: string; file: File }) =>
      uploadPhoto(medicationId, file),
  });
}
