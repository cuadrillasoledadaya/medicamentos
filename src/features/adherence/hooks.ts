// React Query hooks for adherence data.

import { useQuery } from '@tanstack/react-query';
import { getAdherence28d, getWeeklyAverage } from './api';

export function useAdherence28d(pacienteId: string) {
  return useQuery({
    queryKey: ['adherence', pacienteId, '28d'],
    queryFn: async () => {
      const { data, error } = await getAdherence28d(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useWeeklyAdherenceAverage(pacienteId: string) {
  return useQuery({
    queryKey: ['adherence', pacienteId, 'weekly-avg'],
    queryFn: async () => {
      const { data, error } = await getWeeklyAverage(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}
