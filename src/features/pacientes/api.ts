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
  return { data: data as Paciente | null, error: error ? new Error(error.message) : null };
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
