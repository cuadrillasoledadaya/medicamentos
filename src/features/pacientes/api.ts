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

  // The paciente insert triggers a DB-side auto-registration of the
  // creator as cuidador_principal in family_members (see migration
  // 0010). Previously the client tried to do this in a separate
  // insert and silently swallowed the error if it failed, leaving
  // the user with a paciente but no family_member row and breaking
  // every downstream RLS check. The trigger is now the source of
  // truth: it runs as security definer (bypasses RLS), is atomic
  // with the paciente insert, and has ON CONFLICT DO NOTHING so it
  // is safe against re-runs and any future client-side inserts.
  const { data, error } = await client
    .from('pacientes')
    .insert([{ ...input, cuidador_id: user.user.id }])
    .select()
    .single();
  if (error) {
    return { data: data as Paciente | null, error: new Error(error.message) };
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

export async function deletePaciente(id: string): Promise<{ data: null; error: Error | null }> {
  const { error } = await client
    .from('pacientes')
    .delete()
    .eq('id', id);
  return { data: null, error: error ? new Error(error.message) : null };
}
