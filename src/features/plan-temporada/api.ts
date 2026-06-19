// Plan-Temporada API layer — CRUD for temporadas and plans.

import { supabase } from '../../lib/supabase';
import type { Temporada, Plan } from '../../lib/database.types';

const client = supabase as any;

// Temporadas

export async function listTemporadas(
  pacienteId: string,
): Promise<{ data: Temporada[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('temporadas')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  return { data: data as Temporada[] | null, error: error ? new Error(error.message) : null };
}

export async function getTemporada(id: string): Promise<{ data: Temporada | null; error: Error | null }> {
  const { data, error } = await client
    .from('temporadas')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Temporada | null, error: error ? new Error(error.message) : null };
}

export async function createTemporada(
  input: { paciente_id: string; name: string; start_date: string; end_date: string },
): Promise<{ data: Temporada | null; error: Error | null }> {
  const { data, error } = await client
    .from('temporadas')
    .insert([{ ...input }])
    .select()
    .single();
  return { data: data as Temporada | null, error: error ? new Error(error.message) : null };
}

export async function closeTemporada(id: string): Promise<{ data: Temporada | null; error: Error | null }> {
  const { data, error } = await client
    .from('temporadas')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data: data as Temporada | null, error: error ? new Error(error.message) : null };
}

// Plans

export async function listPlans(
  pacienteId: string,
): Promise<{ data: Plan[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('plans')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  return { data: data as Plan[] | null, error: error ? new Error(error.message) : null };
}

export async function createPlan(
  input: { paciente_id: string; is_permanent: boolean; temporada_id?: string | null; notes?: string | null },
): Promise<{ data: Plan | null; error: Error | null }> {
  const { data, error } = await client
    .from('plans')
    .insert([{ ...input }])
    .select()
    .single();
  return { data: data as Plan | null, error: error ? new Error(error.message) : null };
}

// Current context resolver

export interface CurrentContext {
  permanentPlans: Plan[];
  activeTemporada: Temporada | null;
  activePlans: Plan[];
}

export async function getCurrentContext(
  pacienteId: string,
): Promise<{ data: CurrentContext | null; error: Error | null }> {
  try {
    // Get active temporada
    const { data: temporadas } = await client
      .from('temporadas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .is('closed_at', null)
      .limit(1);

    const activeTemporada = (temporadas as Temporada[] | null)?.[0] ?? null;

    // Get permanent plans
    const { data: permPlans } = await client
      .from('plans')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('is_permanent', true);

    // Get plans for active temporada
    let activePlans: Plan[] = [];
    if (activeTemporada) {
      const { data: seasonalPlans } = await client
        .from('plans')
        .select('*')
        .eq('temporada_id', activeTemporada.id);
      activePlans = (seasonalPlans as Plan[] | null) ?? [];
    }

    return {
      data: {
        permanentPlans: (permPlans as Plan[] | null) ?? [],
        activeTemporada,
        activePlans,
      },
      error: null,
    };
  } catch (e: any) {
    return { data: null, error: new Error(e.message) };
  }
}
