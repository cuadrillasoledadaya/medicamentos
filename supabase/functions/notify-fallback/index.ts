// notify-fallback Edge Function
// Triggered by DB trigger on tomas INSERT or pg_cron dispatch.
// Sends web-push, email (Resend), and SMS (Twilio) notifications
// based on paciente's notification_settings. Gracefully handles missing env vars.

import { createClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';
import { buildPushPayload, isSubscriptionDead } from './push-schema.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
const appUrl = Deno.env.get('APP_URL') ?? 'https://medicamentos.app';

// VAPID keys for web-push (optional — web-push skipped if not set)
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configure VAPID if keys are available
let vapidConfigured = false;
if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  vapidConfigured = true;
} else {
  console.log('[notify-fallback] VAPID keys not configured — web-push will be skipped');
}

/**
 * Send web-push notifications to all active subscribers for a toma.
 * Handles 410/404 by marking subscriptions inactive.
 * Logs every attempt to notification_deliveries.
 */
async function sendWebPush(
  toma: {
    toma_id: string;
    paciente_id: string;
    scheduled_at: string;
    medication_name: string;
    dose_value: number | null;
    dose_unit: string | null;
    paciente_name: string;
  },
  subscriptions: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>,
  alertFlags?: {
    require_interaction: boolean;
    vibrate: boolean;
    renotify: boolean;
    badge: boolean;
  } | null,
): Promise<Array<{ subscriptionId: string; status: string; error?: string }>> {
  if (!vapidConfigured) {
    console.log('[notify-fallback] web-push skipped (no VAPID keys)');
    return [];
  }

  const payload = buildPushPayload(toma, alertFlags);
  if (!payload) {
    console.error('[notify-fallback] Failed to build push payload for toma', toma.toma_id);
    return [];
  }

  const payloadString = JSON.stringify(payload);
  const results: Array<{ subscriptionId: string; status: string; error?: string }> = [];

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    try {
      await webpush.sendNotification(pushSubscription, payloadString, {
        TTL: 60,
        urgency: 'high',
      });

      // Success — log delivery
      await supabase.from('notification_deliveries').insert({
        toma_id: toma.toma_id,
        subscription_id: sub.id,
        channel: 'web_push',
        status: 'success',
        error_message: null,
      });

      results.push({ subscriptionId: sub.id, status: 'sent' });
      console.log(`[notify-fallback] web-push sent to ${sub.id}`);
    } catch (err) {
      // web-push throws with statusCode on HTTP errors
      const statusCode = (err as Record<string, unknown>)?.statusCode as number | undefined;
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (statusCode && isSubscriptionDead(statusCode)) {
        // 410/404 — subscription is dead, mark inactive
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', sub.id);

        await supabase.from('notification_deliveries').insert({
          toma_id: toma.toma_id,
          subscription_id: sub.id,
          channel: 'web_push',
          status: 'failure',
          error_message: `HTTP ${statusCode} — subscription expired`,
        });

        results.push({ subscriptionId: sub.id, status: 'subscription_dead', error: `HTTP ${statusCode}` });
        console.log(`[notify-fallback] subscription ${sub.id} marked inactive (${statusCode})`);
      } else {
        // Other error — log failure but continue
        await supabase.from('notification_deliveries').insert({
          toma_id: toma.toma_id,
          subscription_id: sub.id,
          channel: 'web_push',
          status: 'failure',
          error_message: errorMessage,
        });

        results.push({ subscriptionId: sub.id, status: 'failed', error: errorMessage });
        console.error(`[notify-fallback] web-push failed for ${sub.id}: ${errorMessage}`);

        // Diagnostic: log full error context so we can see what the push service is returning
        const errorBody = (err as Record<string, unknown>)?.body as string | undefined;
        const errorHeaders = (err as Record<string, unknown>)?.headers as Record<string, string> | undefined;
        console.error(`[notify-fallback] web-push DIAG sub=${sub.id} statusCode=${statusCode ?? 'none'} message=${errorMessage} body=${errorBody ?? 'none'} headers=${errorHeaders ? JSON.stringify(errorHeaders) : 'none'}`);
      }
    }
  }

  return results;
}

/**
 * Send an email notification via Resend API.
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  if (!resendApiKey) {
    console.log('[notify-fallback] email skipped (no RESEND_API_KEY)');
    return { success: false, error: 'no API key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Medicamentos <notificaciones@medicamentos.app>',
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`[notify-fallback] email failed: ${res.status} ${error}`);
      return { success: false, error };
    }

    console.log('[notify-fallback] email sent successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notify-fallback] email error: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Send an SMS notification via Twilio API.
 */
async function sendSMS(
  to: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    console.log('[notify-fallback] sms skipped (no Twilio credentials)');
    return { success: false, error: 'no credentials' };
  }

  try {
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
          From: twilioFromNumber,
          To: to,
          Body: body,
        }),
      },
    );

    if (!res.ok) {
      const error = await res.text();
      console.error(`[notify-fallback] sms failed: ${res.status} ${error}`);
      return { success: false, error };
    }

    console.log('[notify-fallback] sms sent successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notify-fallback] sms error: ${message}`);
    return { success: false, error: message };
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { tomaId, pacienteId } = body;

    if (!tomaId || !pacienteId) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Missing tomaId or pacienteId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Fetch the toma details with medication and paciente info
    const { data: tomaRaw, error: tomaError } = await supabase
      .from('tomas')
      .select(
        `
        id,
        scheduled_at,
        status,
        schedules!inner (
          medications!inner (
            id,
            name,
            dose_value,
            dose_unit
          )
        ),
        pacientes!inner (
          id,
          name
        )
      `,
      )
      .eq('id', tomaId)
      .single();

    if (tomaError || !tomaRaw) {
      console.error(`[notify-fallback] Failed to fetch toma ${tomaId}: ${tomaError?.message}`);
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Toma not found, skipping' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Normalize the nested data for push-schema compatibility
    const medication = tomaRaw.schedules?.medications;
    const paciente = tomaRaw.pacientes;

    const toma = {
      toma_id: tomaRaw.id,
      paciente_id: pacienteId,
      scheduled_at: tomaRaw.scheduled_at,
      medication_name: medication?.name ?? 'Medicamento',
      dose_value: medication?.dose_value ?? null,
      dose_unit: medication?.dose_unit ?? null,
      paciente_name: paciente?.name ?? 'Paciente',
    };

    // Fetch notification settings for this paciente (global, not per-medication)
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('paciente_id', pacienteId)
      .is('medication_id', null);

    if (settingsError) {
      console.error(`[notify-fallback] Failed to fetch settings: ${settingsError.message}`);
      // Continue anyway — default to no notifications
    }

    const isChannelEnabled = (channel: string): boolean => {
      const found = settings?.find((s) => s.channel === channel);
      if (found) return found.enabled;
      // Defaults: in_app ON, email OFF, sms OFF, web_push OFF
      return channel === 'in_app';
    };

    const results: Record<string, { enabled: boolean; success?: boolean; error?: string }> = {};

    // web-push — first, if enabled and VAPID configured
    const webPushEnabled = isChannelEnabled('web_push');
    if (webPushEnabled && vapidConfigured) {
      // Fetch active push subscribers for this paciente
      const { data: subscribers, error: subError } = await supabase
        .rpc('get_active_push_subscribers', { paciente_id: pacienteId });

      if (subError) {
        console.error(`[notify-fallback] Failed to fetch subscribers: ${subError.message}`);
        results.web_push = { enabled: true, success: false, error: subError.message };
      } else if (subscribers && subscribers.length > 0) {
        // Read alert behavior flags from the web_push settings row
        const webPushSettings = settings?.find((s) => s.channel === 'web_push');
        const alertFlags = webPushSettings ? {
          require_interaction: webPushSettings.require_interaction ?? true,
          vibrate: webPushSettings.vibrate ?? true,
          renotify: webPushSettings.renotify ?? true,
          badge: webPushSettings.badge ?? true,
        } : null;

        const pushResults = await sendWebPush(toma, subscribers, alertFlags);
        const allSent = pushResults.every((r) => r.status === 'sent');
        results.web_push = {
          enabled: true,
          success: allSent,
          error: allSent ? undefined : `${pushResults.filter((r) => r.status !== 'sent').length} failed`,
        };
      } else {
        results.web_push = { enabled: true, success: false, error: 'no active subscribers' };
      }
    } else {
      results.web_push = { enabled: webPushEnabled };
    }

    // in_app: skip (handled by SW)
    results.in_app = { enabled: isChannelEnabled('in_app') };

    // email
    const emailEnabled = isChannelEnabled('email');
    if (emailEnabled) {
      const doseText = toma.dose_value != null ? `${toma.dose_value} ${toma.dose_unit ?? ''}`.trim() : '';
      const intakeUrl = `${appUrl}/intake/${tomaId}`;
      const subject = `💊 Recordatorio: ${toma.medication_name}${doseText ? ` - ${doseText}` : ''}`;
      const html = `
        <p>Es hora de tomar <strong>${toma.medication_name}</strong>.</p>
        <p>Dosis: ${doseText || 'No especificada'}</p>
        <p>Paciente: ${toma.paciente_name}</p>
        <p><a href="${intakeUrl}">Registrar toma</a></p>
      `;

      console.log(`[notify-fallback] email would send to ${toma.paciente_name}: ${subject}`);
      results.email = { enabled: true, success: false, error: 'no email address available' };
    } else {
      results.email = { enabled: false };
    }

    // sms
    const smsEnabled = isChannelEnabled('sms');
    if (smsEnabled) {
      const doseText = toma.dose_value != null ? `${toma.dose_value} ${toma.dose_unit ?? ''}`.trim() : '';
      const intakeUrl = `${appUrl}/intake/${tomaId}`;
      const smsBody = `${toma.medication_name} ${doseText}. ${intakeUrl}`;
      console.log(`[notify-fallback] sms would send: ${smsBody}`);
      results.sms = { enabled: true, success: false, error: 'no phone number available' };
    } else {
      results.sms = { enabled: false };
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        tomaId,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notify-fallback] Unexpected error: ${message}`);
    // Always return 200 — don't block the trigger
    return new Response(
      JSON.stringify({ status: 'ok', message: 'Error handled gracefully', error: message }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
});
