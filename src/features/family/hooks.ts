// React Query hooks for family operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listFamilyMembers, revokeFamilyMember } from './api';

export function useFamilyMembers(pacienteId: string) {
  return useQuery({
    queryKey: ['family', pacienteId, 'list'],
    queryFn: async () => {
      const { data, error } = await listFamilyMembers(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useRevokeFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (membershipId: string) => revokeFamilyMember(membershipId),
    onSuccess: ({ data, error }) => {
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ['family', data.paciente_id, 'list'] });
      }
    },
  });
}

// Placeholder for invite — requires Edge Function in v1
export function useInviteFamilyMember() {
  return useMutation({
    mutationFn: (_params: { pacienteId: string; email: string; role: string }) =>
      Promise.reject(new Error('Invite flow requires Edge Function (not yet implemented)')),
  });
}
