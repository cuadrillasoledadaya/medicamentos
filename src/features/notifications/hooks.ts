// React Query hooks for notification settings.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationSettings,
  updateNotificationSetting,
  getMedicationOverrides,
  setMedicationOverride,
} from './api';

export function useNotificationSettings(pacienteId: string) {
  return useQuery({
    queryKey: ['notification-settings', pacienteId],
    queryFn: async () => {
      const { data, error } = await getNotificationSettings(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useUpdateNotificationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pacienteId,
      channel,
      enabled,
    }: {
      pacienteId: string;
      channel: 'in_app' | 'email' | 'sms';
      enabled: boolean;
    }) => updateNotificationSetting(pacienteId, channel, enabled),
    onSuccess: (_, { pacienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', pacienteId] });
    },
  });
}

export function useMedicationOverrides(pacienteId: string) {
  return useQuery({
    queryKey: ['notification-overrides', pacienteId],
    queryFn: async () => {
      const { data, error } = await getMedicationOverrides(pacienteId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pacienteId,
  });
}

export function useSetMedicationOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pacienteId,
      medicationId,
      channel,
      enabled,
    }: {
      pacienteId: string;
      medicationId: string;
      channel: 'in_app' | 'email' | 'sms';
      enabled: boolean;
    }) => setMedicationOverride(pacienteId, medicationId, channel, enabled),
    onSuccess: (_, { pacienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['notification-overrides', pacienteId] });
    },
  });
}
