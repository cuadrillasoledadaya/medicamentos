// Tomas API layer — CRUD for tomas table.

import { supabase } from '../../lib/supabase';
import type { Toma } from '../../lib/database.types';

const client = supabase as any;

export async function listTomas(
  pacienteId: string,
  dateRange?: { from: string; to: string },
): Promise<{ data: Toma[] | null; error: Error | null }> {
  let query = client.from('tomas').select('*').eq('paciente_id', pacienteId);

  if (dateRange) {
    query = query.gte('scheduled_at', dateRange.from).lte('scheduled_at', dateRange.to);
  }

  query = query.order('scheduled_at', { ascending: false });

  const { data, error } = await query;
  return { data: data as Toma[] | null, error: error ? new Error(error.message) : null };
}

export async function listTodayTomas(
  pacienteId: string,
): Promise<{ data: Toma[] | null; error: Error | null }> {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const { data, error } = await client
    .from('tomas')
    .select('*')
    .eq('paciente_id', pacienteId)
    .gte('scheduled_at', start.toISOString())
    .lt('scheduled_at', end.toISOString())
    .order('scheduled_at', { ascending: true });

  return { data: data as Toma[] | null, error: error ? new Error(error.message) : null };
}

export async function markTomaTaken(
  tomaId: string,
  takenAt: string,
): Promise<{ data: Toma | null; error: Error | null }> {
  const { data, error } = await client
    .from('tomas')
    .update({ status: 'taken_on_time', taken_at: takenAt })
    .eq('id', tomaId)
    .select()
    .single();
  return { data: data as Toma | null, error: error ? new Error(error.message) : null };
}

export async function markTomaSkipped(
  tomaId: string,
  reason: string,
): Promise<{ data: Toma | null; error: Error | null }> {
  const { data, error } = await client
    .from('tomas')
    .update({ status: 'skipped', skip_reason: reason })
    .eq('id', tomaId)
    .select()
    .single();
  return { data: data as Toma | null, error: error ? new Error(error.message) : null };
}

export async function upsertToma(
  tomaData: {
    schedule_id: string;
    paciente_id: string;
    scheduled_at: string;
    status?: string;
    taken_at?: string | null;
    skip_reason?: string | null;
    notes?: string | null;
  },
): Promise<{ data: Toma | null; error: Error | null }> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await client
    .from('tomas')
    .upsert([{
      schedule_id: tomaData.schedule_id,
      paciente_id: tomaData.paciente_id,
      scheduled_at: tomaData.scheduled_at,
      status: tomaData.status ?? 'pending',
      taken_at: tomaData.taken_at ?? null,
      skip_reason: tomaData.skip_reason ?? null,
      registered_by: user.user.id,
      notes: tomaData.notes ?? null,
    }], { onConflict: 'schedule_id,scheduled_at' })
    .select()
    .single();

  return { data: data as Toma | null, error: error ? new Error(error.message) : null };
}
