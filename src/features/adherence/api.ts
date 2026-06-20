// Adherence API layer — reads from v_adherence_28d view.

import { supabase } from '../../lib/supabase';

export interface AdherenceDay {
  date: string;
  paciente_id: string;
  on_time: number | null;
  late: number | null;
  missed: number | null;
  skipped: number | null;
  adherence_pct: number | null;
}

export async function getAdherence28d(
  pacienteId: string,
): Promise<{ data: AdherenceDay[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('v_adherence_28d')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('date', { ascending: true });

  return { data: data as AdherenceDay[] | null, error: error ? new Error(error.message) : null };
}

export async function getWeeklyAverage(
  pacienteId: string,
): Promise<{ data: { week: number; avg_pct: number | null }[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('v_adherence_28d')
    .select('*')
    .eq('paciente_id', pacienteId);

  if (error) return { data: null, error: new Error(error.message) };

  const rows = (data as AdherenceDay[] | null) ?? [];
  const weeks: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };

  for (const row of rows) {
    if (row.adherence_pct === null) continue;
    const dayOfMonth = new Date(row.date).getDate();
    const weekNum = Math.ceil(dayOfMonth / 7);
    if (weekNum >= 1 && weekNum <= 4) {
      weeks[weekNum].push(row.adherence_pct);
    }
  }

  const result = Object.entries(weeks).map(([week, values]) => ({
    week: parseInt(week, 10),
    avg_pct: values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : null,
  }));

  return { data: result, error: null };
}
