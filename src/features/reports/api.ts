// Reports API layer — data fetching for PDF + share link upload to Storage.

import { supabase } from '../../lib/supabase';
import type { Medication, Schedule, Toma } from '../../lib/database.types';

const client = supabase as any;

export interface ReportData {
  paciente: { id: string; name: string; dob: string | null; timezone_id: string };
  medications: Medication[];
  schedules: (Schedule & { medication_name: string })[];
  tomas: Toma[];
  adherence: { date: string; adherence_pct: number | null }[];
  dateRange: { from: string; to: string };
}

export async function fetchReportData(
  pacienteId: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ data: ReportData | null; error: Error | null }> {
  try {
    // Fetch paciente info
    const { data: paciente, error: pErr } = await client
      .from('pacientes')
      .select('id, name, dob, timezone_id')
      .eq('id', pacienteId)
      .single();

    if (pErr || !paciente) return { data: null, error: new Error(pErr?.message ?? 'Paciente not found') };

    // Fetch active medications
    const { data: medications, error: mErr } = await client
      .from('medications')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('active', true);

    if (mErr) return { data: null, error: new Error(mErr.message) };

    // Fetch active schedules with medication names
    const { data: schedules, error: sErr } = await client
      .from('schedules')
      .select('*, medications(name)')
      .eq('medication_id', 'in', ((medications as Medication[]) ?? []).map((m) => m.id))
      .eq('active', true);

    if (sErr) return { data: null, error: new Error(sErr.message) };

    // Fetch tomas for date range
    const { data: tomas, error: tErr } = await client
      .from('tomas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .gte('scheduled_at', dateFrom)
      .lte('scheduled_at', dateTo)
      .order('scheduled_at', { ascending: true });

    if (tErr) return { data: null, error: new Error(tErr.message) };

    // Fetch adherence data for date range
    const { data: adherence, error: aErr } = await client
      .from('v_adherence_28d')
      .select('date, adherence_pct')
      .eq('paciente_id', pacienteId)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: true });

    if (aErr) return { data: null, error: new Error(aErr.message) };

    return {
      data: {
        paciente: paciente as ReportData['paciente'],
        medications: (medications as Medication[] | null) ?? [],
        schedules: (schedules as any[] | null)?.map((s: any) => ({
          ...s,
          medication_name: s.medications?.name ?? 'Unknown',
        })) ?? [],
        tomas: (tomas as Toma[] | null) ?? [],
        adherence: (adherence as any[] | null)?.map((a: any) => ({
          date: a.date,
          adherence_pct: a.adherence_pct,
        })) ?? [],
        dateRange: { from: dateFrom, to: dateTo },
      },
      error: null,
    };
  } catch (e: any) {
    return { data: null, error: new Error(e.message) };
  }
}

/** Upload JSON report blob to Supabase Storage and return a 7-day signed URL. */
export async function uploadShareLink(
  reportData: ReportData,
): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
  const fileName = `report-${Date.now()}.json`;

  // Upload to 'report-shares' bucket
  const { error: uploadError } = await client.storage
    .from('report-shares')
    .upload(fileName, blob, { contentType: 'application/json' });

  if (uploadError) return { data: null, error: new Error(uploadError.message) };

  // Generate 7-day signed URL
  const { data: signedData, error: signError } = await client.storage
    .from('report-shares')
    .createSignedUrl(fileName, 7 * 24 * 3600);

  if (signError) return { data: null, error: new Error(signError.message) };

  return { data: { signedUrl: signedData.signedUrl }, error: null };
}

/** Fetch report data from a share link (public read via signed URL). */
export async function fetchSharedReport(
  signedUrl: string,
): Promise<{ data: ReportData | null; error: Error | null }> {
  try {
    const response = await fetch(signedUrl);
    if (!response.ok) return { data: null, error: new Error('Failed to fetch shared report') };
    const data = await response.json();
    return { data: data as ReportData, error: null };
  } catch (e: any) {
    return { data: null, error: new Error(e.message) };
  }
}
