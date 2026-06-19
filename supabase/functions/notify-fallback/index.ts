// notify-fallback Edge Function
// Triggered by DB trigger on tomas INSERT. Sends email/SMS notifications
// based on paciente's notification_settings. Gracefully handles missing env vars.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
const appUrl = Deno.env.get('APP_URL') ?? 'https://medicamentos.app';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: toma, error: tomaError } = await supabase
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

    if (tomaError || !toma) {
      console.error(`[notify-fallback] Failed to fetch toma ${tomaId}: ${tomaError?.message}`);
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Toma not found, skipping' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

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
      // Defaults: in_app ON, email OFF, sms OFF
      return channel === 'in_app';
    };

    const medication = toma.schedules?.medications;
    const paciente = toma.pacientes;

    const medicationName = medication?.name ?? 'Medicamento';
    const doseValue = medication?.dose_value ?? 0;
    const doseUnit = medication?.dose_unit ?? '';
    const pacienteName = paciente?.name ?? 'Paciente';

    const doseText = doseValue > 0 ? `${doseValue} ${doseUnit}` : '';
    const intakeUrl = `${appUrl}/intake/${tomaId}`;

    const results: Record<string, { enabled: boolean; success?: boolean; error?: string }> = {};

    // in_app: skip (handled by SW)
    results.in_app = { enabled: isChannelEnabled('in_app') };

    // email
    const emailEnabled = isChannelEnabled('email');
    if (emailEnabled) {
      // Note: In a real app, you'd fetch the user's email from auth.users
      // For now, we log the intent
      const subject = `💊 Recordatorio: ${medicationName}${doseText ? ` - ${doseText}` : ''}`;
      const html = `
        <p>Es hora de tomar <strong>${medicationName}</strong>.</p>
        <p>Dosis: ${doseText || 'No especificada'}</p>
        <p>Paciente: ${pacienteName}</p>
        <p><a href="${intakeUrl}">Registrar toma</a></p>
      `;

      // We don't have the user's email here — would need to join with auth.users
      // For now, log the intent
      console.log(`[notify-fallback] email would send to ${pacienteName}: ${subject}`);
      results.email = { enabled: true, success: false, error: 'no email address available' };
    } else {
      results.email = { enabled: false };
    }

    // sms
    const smsEnabled = isChannelEnabled('sms');
    if (smsEnabled) {
      // Note: In a real app, you'd fetch the user's phone from a profile table
      const smsBody = `${medicationName} ${doseText}. ${intakeUrl}`;
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
