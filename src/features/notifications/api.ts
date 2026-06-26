// Notification settings API — CRUD for notification_settings table.

import { supabase } from '../../lib/supabase';
import type { NotificationSetting } from '../../lib/database.types';

const client = supabase as any;

export async function getNotificationSettings(
  pacienteId: string,
): Promise<{ data: NotificationSetting[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('notification_settings')
    .select('*')
    .eq('paciente_id', pacienteId)
    .is('medication_id', null);

  return { data: data as NotificationSetting[] | null, error: error ? new Error(error.message) : null };
}

export async function updateNotificationSetting(
  pacienteId: string,
  channel: 'in_app' | 'email' | 'sms' | 'web_push',
  enabled: boolean,
): Promise<{ data: NotificationSetting | null; error: Error | null }> {
  const { data, error } = await client
    .from('notification_settings')
    .upsert({
      paciente_id: pacienteId,
      medication_id: null,
      channel,
      enabled,
    }, { onConflict: 'paciente_id,medication_id,channel' })
    .select()
    .single();

  return { data: data as NotificationSetting | null, error: error ? new Error(error.message) : null };
}

export async function getMedicationOverrides(
  pacienteId: string,
): Promise<{ data: NotificationSetting[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('notification_settings')
    .select('*')
    .eq('paciente_id', pacienteId)
    .not('medication_id', 'is', null);

  return { data: data as NotificationSetting[] | null, error: error ? new Error(error.message) : null };
}

export async function setMedicationOverride(
  pacienteId: string,
  medicationId: string,
  channel: 'in_app' | 'email' | 'sms',
  enabled: boolean,
): Promise<{ data: NotificationSetting | null; error: Error | null }> {
  const { data, error } = await client
    .from('notification_settings')
    .upsert({
      paciente_id: pacienteId,
      medication_id: medicationId,
      channel,
      enabled,
    }, { onConflict: 'paciente_id,medication_id,channel' })
    .select()
    .single();

  return { data: data as NotificationSetting | null, error: error ? new Error(error.message) : null };
}

/**
 * Log that a notification was delivered via a specific channel.
 * Currently stored in the toma's notes field as a prefix.
 */
export async function logNotificationDelivered(
  tomaId: string,
  channel: string,
): Promise<void> {
  const { data: existing } = await client
    .from('tomas')
    .select('notes')
    .eq('id', tomaId)
    .single();

  const note = `[notif:${channel}] ${new Date().toISOString()}`;
  const newNotes = existing?.notes ? `${existing.notes}\n${note}` : note;

  await client
    .from('tomas')
    .update({ notes: newNotes })
    .eq('id', tomaId);
}

// ---------------------------------------------------------------------------
// Push subscription management
// ---------------------------------------------------------------------------

/**
 * List all active push subscriptions for the current user.
 */
export async function getPushSubscriptions(): Promise<{
  data: Array<{
    id: string;
    endpoint: string;
    device_name: string | null;
    is_active: boolean;
    created_at: string;
    last_seen_at: string | null;
  }> | null;
  error: Error | null;
}> {
  const { data, error } = await client
    .from('push_subscriptions')
    .select('id, endpoint, device_name, is_active, created_at, last_seen_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return {
    data: data as Array<{
      id: string;
      endpoint: string;
      device_name: string | null;
      is_active: boolean;
      created_at: string;
      last_seen_at: string | null;
    }> | null,
    error: error ? new Error(`Failed to list subscriptions: ${error.message}`) : null,
  };
}

/**
 * Revoke (deactivate) a push subscription by id.
 */
export async function revokePushSubscription(
  subscriptionId: string,
): Promise<{ data: null; error: Error | null }> {
  const { error } = await (client.from('push_subscriptions') as any)
    .update({ is_active: false })
    .eq('id', subscriptionId);

  return {
    data: null,
    error: error ? new Error(`Failed to revoke subscription: ${error.message}`) : null,
  };
}
