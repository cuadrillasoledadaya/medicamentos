// Vacation API layer — CRUD for vacations table with GLOBAL/PER_MEDICATION scope.

import { supabase } from '../../lib/supabase';
import type { Vacation } from '../../lib/database.types';

const client = supabase as any;

export interface VacationInput {
  paciente_id: string;
  medication_id: string | null; // null = GLOBAL scope
  starts_at: string;
  ends_at: string;
  reason?: string | null;
}

export async function listVacations(
  pacienteId: string,
): Promise<{ data: Vacation[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('vacations')
    .select('*, medications(name)')
    .eq('paciente_id', pacienteId)
    .order('starts_at', { ascending: false });

  return { data: data as Vacation[] | null, error: error ? new Error(error.message) : null };
}

export async function createVacation(
  input: VacationInput,
): Promise<{ data: Vacation | null; error: Error | null }> {
  const { data, error } = await client
    .from('vacations')
    .insert([{
      paciente_id: input.paciente_id,
      medication_id: input.medication_id,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      reason: input.reason ?? null,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? '',
    }])
    .select()
    .single();

  // EXCLUDE constraint violation → 23P01 → map to 409 conflict
  if (error && error.code === '23P01') {
    return { data: null, error: new Error('Conflicto de fechas: ya existe una vacaciones que se superpone en este rango.') };
  }

  return { data: data as Vacation | null, error: error ? new Error(error.message) : null };
}

export async function cancelVacation(
  vacationId: string,
): Promise<{ data: Vacation | null; error: Error | null }> {
  // Set ends_at to now() to cancel mid-vacation
  const { data, error } = await client
    .from('vacations')
    .update({ ends_at: new Date().toISOString() })
    .eq('id', vacationId)
    .select()
    .single();

  return { data: data as Vacation | null, error: error ? new Error(error.message) : null };
}

export async function deleteVacation(
  vacationId: string,
): Promise<{ data: null; error: Error | null }> {
  const { error } = await client
    .from('vacations')
    .delete()
    .eq('id', vacationId);

  return { data: null, error: error ? new Error(error.message) : null };
}
