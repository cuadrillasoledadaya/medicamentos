// Family API layer — manage family memberships for a paciente.

import { supabase } from '../../lib/supabase';
import type { FamilyMember } from '../../lib/database.types';

const client = supabase as any;

export async function listFamilyMembers(
  pacienteId: string,
): Promise<{ data: FamilyMember[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('family_members')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  return { data: data as FamilyMember[] | null, error: error ? new Error(error.message) : null };
}

export async function inviteFamilyMember(
  _pacienteId: string,
  _email: string,
  _role: string,
): Promise<{ data: FamilyMember | null; error: Error | null }> {
  return {
    data: null,
    error: new Error('Invite flow requires an Edge Function to resolve email to user_id (not yet implemented)'),
  };
}

export async function revokeFamilyMember(
  membershipId: string,
): Promise<{ data: FamilyMember | null; error: Error | null }> {
  const { data, error } = await client
    .from('family_members')
    .update({ status: 'revoked' })
    .eq('id', membershipId)
    .select()
    .single();
  return { data: data as FamilyMember | null, error: error ? new Error(error.message) : null };
}

export async function acceptInvite(
  _token: string,
): Promise<{ data: FamilyMember | null; error: Error | null }> {
  return {
    data: null,
    error: new Error('Accept invite flow requires an Edge Function (not yet implemented)'),
  };
}
