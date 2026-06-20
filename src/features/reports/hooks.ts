// React Query hooks for reports.

import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchReportData, uploadShareLink, fetchSharedReport } from './api';
import type { ReportData } from './api';

export function useGenerateReport(pacienteId: string, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['reports', pacienteId, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await fetchReportData(pacienteId, dateFrom, dateTo);
      if (error) throw error;
      return data;
    },
    enabled: !!pacienteId && !!dateFrom && !!dateTo,
  });
}

export function useUploadShareLink() {
  return useMutation({
    mutationFn: (reportData: ReportData) => uploadShareLink(reportData),
  });
}

export function useSharedReport(signedUrl: string) {
  return useQuery({
    queryKey: ['reports', 'shared', signedUrl],
    queryFn: async () => {
      const { data, error } = await fetchSharedReport(signedUrl);
      if (error) throw error;
      return data;
    },
    enabled: !!signedUrl,
  });
}
