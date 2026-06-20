// Interactions API layer — CRUD for interactions table + conflict detection.

import { supabase } from '../../lib/supabase';
import type { Interaction } from '../../lib/database.types';

const client = supabase as any;

export async function listInteractions(): Promise<{ data: Interaction[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('interactions')
    .select('*')
    .order('severity', { ascending: false });

  return { data: data as Interaction[] | null, error: error ? new Error(error.message) : null };
}

export async function getInteraction(id: string): Promise<{ data: Interaction | null; error: Error | null }> {
  const { data, error } = await client
    .from('interactions')
    .select('*')
    .eq('id', id)
    .single();

  return { data: data as Interaction | null, error: error ? new Error(error.message) : null };
}

export async function createInteraction(
  input: { drug_a: string; drug_b: string; severity: string; description: string; source_notes?: string | null },
): Promise<{ data: Interaction | null; error: Error | null }> {
  // Enforce canonical ordering (alphabetically lower first)
  const [a, b] = [input.drug_a.toLowerCase(), input.drug_b.toLowerCase()].sort();

  const { data, error } = await client
    .from('interactions')
    .insert([{ drug_a: a, drug_b: b, severity: input.severity, description: input.description, source_notes: input.source_notes ?? null }])
    .select()
    .single();

  return { data: data as Interaction | null, error: error ? new Error(error.message) : null };
}

export async function updateInteraction(
  id: string,
  patch: { drug_a?: string; drug_b?: string; severity?: string; description?: string; source_notes?: string | null },
): Promise<{ data: Interaction | null; error: Error | null }> {
  const payload: Record<string, unknown> = { ...patch };

  // Re-enforce canonical ordering if drug names changed
  if (patch.drug_a || patch.drug_b) {
    const [a, b] = [
      (patch.drug_a ?? payload.drug_a as string).toLowerCase(),
      (patch.drug_b ?? payload.drug_b as string).toLowerCase(),
    ].sort();
    payload.drug_a = a;
    payload.drug_b = b;
  }

  const { data, error } = await client
    .from('interactions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  return { data: data as Interaction | null, error: error ? new Error(error.message) : null };
}

export async function deleteInteraction(id: string): Promise<{ data: null; error: Error | null }> {
  const { error } = await client
    .from('interactions')
    .delete()
    .eq('id', id);

  return { data: null, error: error ? new Error(error.message) : null };
}

/** Check if a medication name conflicts with any active medication names for the same paciente. */
export async function checkInteractionForMedication(
  medicationName: string,
  activeMedicationNames: string[],
): Promise<{ data: Interaction[] | null; error: Error | null }> {
  if (activeMedicationNames.length === 0) return { data: [], error: null };

  const name = medicationName.toLowerCase();
  const activeNames = activeMedicationNames.map((n) => n.toLowerCase());

  // Build query: find any interaction where one drug matches the new med and the other matches an active med
  const conditions: string[] = [];
  for (const active of activeNames) {
    const [a, b] = [name, active].sort();
    conditions.push(`(drug_a.eq.${a}.and.drug_b.eq.${b})`);
  }

  if (conditions.length === 0) return { data: [], error: null };

  const { data, error } = await client
    .from('interactions')
    .select('*')
    .or(conditions.join(','));

  return { data: data as Interaction[] | null, error: error ? new Error(error.message) : null };
}

/** Check for temporal conflicts between schedules of interacting medications. */
export async function checkTemporalConflicts(
  pacienteId: string,
  scheduleTimeOfDay: string,
  medicationId: string,
): Promise<{ data: { medication_name: string; time_of_day: string; severity: string; description: string }[] | null; error: Error | null }> {
  // Get the medication name for the new schedule
  const { data: med, error: medErr } = await client
    .from('medications')
    .select('name')
    .eq('id', medicationId)
    .single();

  if (medErr || !med) return { data: [], error: medErr ? new Error(medErr.message) : null };

  const medName = (med as { name: string }).name.toLowerCase();

  // Get all active schedules for other medications of the same paciente
  const { error: schedErr } = await client
    .from('schedules')
    .select('*, medications(name)')
    .eq('medication_id', medicationId)
    .eq('active', true);

  if (schedErr) return { data: [], error: new Error(schedErr.message) };

  // Get all active medications for the paciente
  const { data: activeMeds, error: medsErr } = await client
    .from('medications')
    .select('id, name')
    .eq('paciente_id', pacienteId)
    .eq('active', true)
    .neq('id', medicationId);

  if (medsErr || !activeMeds || activeMeds.length === 0) return { data: [], error: null };

  // Check each active medication for interactions
  const conflicts: { medication_name: string; time_of_day: string; severity: string; description: string }[] = [];

  for (const otherMed of activeMeds as { id: string; name: string }[]) {
    const [a, b] = [medName, otherMed.name.toLowerCase()].sort();

    const { data: interaction } = await client
      .from('interactions')
      .select('*')
      .eq('drug_a', a)
      .eq('drug_b', b)
      .in('severity', ['caution', 'warning', 'severe'])
      .single();

    if (interaction) {
      // Get schedules for the other medication
      const { data: otherSchedules } = await client
        .from('schedules')
        .select('time_of_day')
        .eq('medication_id', otherMed.id)
        .eq('active', true);

      if (otherSchedules) {
        for (const sched of otherSchedules as { time_of_day: string }[]) {
          const diff = timeDiffMinutes(scheduleTimeOfDay, sched.time_of_day);
          if (Math.abs(diff) <= 5) {
            conflicts.push({
              medication_name: otherMed.name,
              time_of_day: sched.time_of_day,
              severity: (interaction as { severity: string }).severity,
              description: (interaction as { description: string }).description,
            });
          }
        }
      }
    }
  }

  return { data: conflicts, error: null };
}

function timeDiffMinutes(t1: string, t2: string): number {
  const [h1, m1] = t1.split(':').map(Number);
  const [h2, m2] = t2.split(':').map(Number);
  return (h1 * 60 + m1) - (h2 * 60 + m2);
}
