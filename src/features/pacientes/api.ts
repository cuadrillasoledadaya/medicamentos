// Pacientes API layer — RLS-aware CRUD for pacientes table.

import { supabase } from '../../lib/supabase';
import type { Paciente } from '../../lib/database.types';

const client = supabase as any;

export async function listPacientes(): Promise<{ data: Paciente[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('pacientes')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data as Paciente[] | null, error: error ? new Error(error.message) : null };
}

export async function getPaciente(id: string): Promise<{ data: Paciente | null; error: Error | null }> {
  const { data, error } = await client
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Paciente | null, error: error ? new Error(error.message) : null };
}

export async function createPaciente(
  input: { name: string; dob?: string | null; timezone_id?: string },
): Promise<{ data: Paciente | null; error: Error | null }> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await client
    .from('pacientes')
    .insert([{ ...input, cuidador_id: user.user.id }])
    .select()
    .single();
  if (error) {
    return { data: data as Paciente | null, error: new Error(error.message) };
  }

  // Auto-register the creator as cuidador_principal in family_members.
  // This is required by the RLS on medications / schedules / plans / tomas:
  // those policies check is_cuidador_principal(paciente_id), which reads
  // from family_members. Without this row, the creator cannot add any
  // data to their own paciente even though they own it.
  const { error: familyError } = await client
    .from('family_members')
    .insert([{
      paciente_id: data.id,
      user_id: user.user.id,
      role: 'cuidador_principal',
      status: 'active',
    }]);
  if (familyError) {
    // Surface a warning but don't roll back the paciente — the user can
    // re-run the backfill SQL to fix the missing family_member row.
    console.warn('createPaciente: failed to create family_member row', familyError);
  }

  return { data: data as Paciente | null, error: null };
}

export async function updatePaciente(
  id: string,
  patch: { name?: string; dob?: string | null; timezone_id?: string; photo_url?: string | null },
): Promise<{ data: Paciente | null; error: Error | null }> {
  const { data, error } = await client
    .from('pacientes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return { data: data as Paciente | null, error: error ? new Error(error.message) : null };
}
