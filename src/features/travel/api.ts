// Travel API layer — TZ change + trip shift adjustments.

import { supabase } from '../../lib/supabase';
import type { Paciente } from '../../lib/database.types';

const client = supabase as any;

/** Update a paciente's timezone_id.
 *
 * NOTE: When the paciente's TZ changes, future tomas need recomputation.
 * The cleanest approach is to mark active schedules as needing recomputation
 * and re-run materialize_tomas for the next 14 days. This is handled by
 * the DB-side materialize_tomas function (from 0004) on the next cron run.
 * Historical tomas keep their original TZ (stored as UTC).
 */
export async function updatePacienteTimezone(
  pacienteId: string,
  newTimezoneId: string,
): Promise<{ data: Paciente | null; error: Error | null }> {
  const { data, error } = await client
    .from('pacientes')
    .update({ timezone_id: newTimezoneId })
    .eq('id', pacienteId)
    .select()
    .single();

  return { data: data as Paciente | null, error: error ? new Error(error.message) : null };
}

/** Create a trip adjustment record (±N hours for a date range).
 * Trip shifts temporarily override schedule times during the trip period.
 * Recorded as an audit row in patient_trip_adjustments.
 */
export async function createTripAdjustment(
  input: {
    paciente_id: string;
    starts_at: string;
    ends_at: string;
    shift_hours: number;
    reason?: string | null;
  },
): Promise<{ data: any | null; error: Error | null }> {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? '';

  const { data, error } = await client
    .from('patient_trip_adjustments')
    .insert([{
      paciente_id: input.paciente_id,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      shift_hours: input.shift_hours,
      reason: input.reason ?? null,
      created_by: userId,
    }])
    .select()
    .single();

  return { data, error: error ? new Error(error.message) : null };
}

/** List trip adjustments for a paciente. */
export async function listTripAdjustments(
  pacienteId: string,
): Promise<{ data: any[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('patient_trip_adjustments')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('starts_at', { ascending: false });

  return { data, error: error ? new Error(error.message) : null };
}

/** Common timezone options for Latin America + Europe. */
export const COMMON_TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'UTC',
];
