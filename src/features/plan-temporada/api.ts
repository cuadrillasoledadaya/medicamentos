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

/** Reopen a closed temporada > 90 days old with a reason.
 *
 * ORDER OF OPERATIONS (critical — matches DB trigger behavior from 0005):
 * 1. INSERT a temporada_reopen_audit row FIRST (reason must be >= 10 chars)
 * 2. THEN attempt the modification (the trigger checks for the audit row)
 *
 * The UI must capture the reason and INSERT the audit row BEFORE any modification.
 */
export async function reopenTemporada(
  temporadaId: string,
  reason: string,
): Promise<{ data: { auditId: string } | null; error: Error | null }> {
  if (reason.length < 10) {
    return { data: null, error: new Error('El motivo debe tener al menos 10 caracteres.') };
  }

  const userId = (await supabase.auth.getUser()).data.user?.id ?? '';

  // Step 1: Insert audit row FIRST (the trigger checks for this)
  const { data: audit, error: auditError } = await client
    .from('temporada_reopen_audit')
    .insert([{
      temporada_id: temporadaId,
      user_id: userId,
      reason,
    }])
    .select('id')
    .single();

  if (auditError) return { data: null, error: new Error(auditError.message) };

  // Step 2: The temporada is now modifiable (trigger will allow it)
  // The caller can now update plans/tomas as needed.
  return { data: { auditId: (audit as { id: string }).id }, error: null };
}

/** List reopen audit entries for a temporada. */
export async function listReopenAudit(
  temporadaId: string,
): Promise<{ data: any[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('temporada_reopen_audit')
    .select('*')
    .eq('temporada_id', temporadaId)
    .order('modified_at', { ascending: false });

  return { data, error: error ? new Error(error.message) : null };
}

/** Check if a temporada is eligible for reopen (closed > 90 days ago). */
export function isReopenEligible(temporada: { closed_at: string | null }): boolean {
  if (!temporada.closed_at) return false;
  const closedDate = new Date(temporada.closed_at);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return closedDate < ninetyDaysAgo;
}
