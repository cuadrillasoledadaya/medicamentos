// Retention API layer — view and update retention policies.

import { supabase } from '../../lib/supabase';

const client = supabase as any;

export interface RetentionPolicy {
  id: string;
  paciente_id: string | null;
  retention_days: number;
  created_at: string;
  updated_at: string;
}

export async function getRetentionPolicies(
  pacienteId: string,
): Promise<{ data: { global: RetentionPolicy | null; perPaciente: RetentionPolicy | null } | null; error: Error | null }> {
  const { data, error } = await client
    .from('retention_policies')
    .select('*')
    .or(`paciente_id.is.null,paciente_id.eq.${pacienteId}`);

  if (error) return { data: null, error: new Error(error.message) };

  const policies = (data as RetentionPolicy[] | null) ?? [];
  const global = policies.find((p) => p.paciente_id === null) ?? null;
  const perPaciente = policies.find((p) => p.paciente_id === pacienteId) ?? null;

  return { data: { global, perPaciente }, error: null };
}

export async function upsertRetentionOverride(
  pacienteId: string,
  retentionDays: number,
): Promise<{ data: RetentionPolicy | null; error: Error | null }> {
  // Check if a per-paciente policy already exists
  const { data: existing } = await client
    .from('retention_policies')
    .select('id')
    .eq('paciente_id', pacienteId)
    .single();

  const userId = (await supabase.auth.getUser()).data.user?.id ?? '';

  let result;
  if (existing) {
    result = await client
      .from('retention_policies')
      .update({ retention_days: retentionDays, updated_at: new Date().toISOString() })
      .eq('id', (existing as { id: string }).id)
      .select()
      .single();
  } else {
    result = await client
      .from('retention_policies')
      .insert([{ paciente_id: pacienteId, retention_days: retentionDays, created_by: userId }])
      .select()
      .single();
  }

  return { data: result.data as RetentionPolicy | null, error: result.error ? new Error(result.error.message) : null };
}

/** Archive job stub — FEATURE-FLAGGED OFF in v1. DO NOT schedule via cron yet. */
export async function runArchiveJobStub(): Promise<{ message: string }> {
  // This function exists as a placeholder for the archive logic.
  // It is NOT called by any active trigger or cron job in v1.
  // To enable: wire to pg_cron or a scheduled Edge Function.
  return { message: 'Archive job is feature-flagged OFF in v1. Uncomment the SQL logic when ready.' };

  /*
  // Archive step: move tomas older than retention_days to tomas_archive
  // Hard-delete step: remove archive rows older than 36 months
  // See retention/spec.md for the full SQL definition.
  */
}
