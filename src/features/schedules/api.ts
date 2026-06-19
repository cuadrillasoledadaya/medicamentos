// Schedules API layer — CRUD for schedules table.

import { supabase } from '../../lib/supabase';
import type { Schedule } from '../../lib/database.types';

const client = supabase as any;

export async function listSchedules(
  medicationId: string,
): Promise<{ data: Schedule[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('schedules')
    .select('*')
    .eq('medication_id', medicationId)
    .order('time_of_day', { ascending: true });
  return { data: data as Schedule[] | null, error: error ? new Error(error.message) : null };
}

export async function getSchedule(id: string): Promise<{ data: Schedule | null; error: Error | null }> {
  const { data, error } = await client
    .from('schedules')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Schedule | null, error: error ? new Error(error.message) : null };
}

export async function createSchedule(
  input: {
    medication_id: string;
    time_of_day: string;
    weekday_mask: number;
    timezone_id?: string;
    notes?: string | null;
  },
): Promise<{ data: Schedule | null; error: Error | null }> {
  const { data, error } = await client
    .from('schedules')
    .insert([{ ...input }])
    .select()
    .single();
  return { data: data as Schedule | null, error: error ? new Error(error.message) : null };
}

export async function updateSchedule(
  id: string,
  patch: {
    time_of_day?: string;
    weekday_mask?: number;
    timezone_id?: string;
    active?: boolean;
    notes?: string | null;
  },
): Promise<{ data: Schedule | null; error: Error | null }> {
  const { data, error } = await client
    .from('schedules')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return { data: data as Schedule | null, error: error ? new Error(error.message) : null };
}

export async function deactivateSchedule(id: string): Promise<{ data: Schedule | null; error: Error | null }> {
  const { data, error } = await client
    .from('schedules')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single();
  return { data: data as Schedule | null, error: error ? new Error(error.message) : null };
}

export async function reactivateSchedule(id: string): Promise<{ data: Schedule | null; error: Error | null }> {
  const { data, error } = await client
    .from('schedules')
    .update({ active: true })
    .eq('id', id)
    .select()
    .single();
  return { data: data as Schedule | null, error: error ? new Error(error.message) : null };
}
