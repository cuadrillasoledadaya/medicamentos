// schedule-generator Edge Function
// Scheduled daily via pg_cron. Reads active schedules and generates tomas
// for the next 7 days. Idempotent via (schedule_id, scheduled_at) unique constraint.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { fromZonedTime } from 'https://esm.sh/date-fns-tz@3.2.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check if a date range overlaps with any active vacation for a paciente/medication.
 */
async function hasVacationOverlap(
  pacienteId: string,
  medicationId: string | null,
  startsAt: string,
  endsAt: string,
): Promise<boolean> {
  // Check global vacations (medication_id IS NULL)
  const { data: globalVacations } = await supabase
    .from('vacations')
    .select('id')
    .eq('paciente_id', pacienteId)
    .is('medication_id', null)
    .lte('starts_at', endsAt)
    .gte('ends_at', startsAt);

  if (globalVacations && globalVacations.length > 0) return true;

  // Check per-medication vacations
  if (medicationId) {
    const { data: medVacations } = await supabase
      .from('vacations')
      .select('id')
      .eq('paciente_id', pacienteId)
      .eq('medication_id', medicationId)
      .lte('starts_at', endsAt)
      .gte('ends_at', startsAt);

    if (medVacations && medVacations.length > 0) return true;
  }

  return false;
}

/**
 * Get the day-of-week (0=Sun..6=Sat) of a given calendar date interpreted
 * in the target timezone. Uses Intl.DateTimeFormat to read the local
 * weekday without depending on the host's TZ.
 */
function getDayOfWeekInTimezone(year: number, month: number, day: number, timezoneId: string): number {
  // Build an ISO-ish date at noon to avoid DST edge cases for the weekday read
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneId,
    weekday: 'short',
  });
  const weekdayName = formatter.format(noonUtc); // 'Sun'..'Sat'
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekdayName] ?? 0;
}

/**
 * Generate all scheduled_at timestamps for a schedule over the next 7 days.
 * Respects the schedule's weekday_mask and timezone. The returned Date
 * objects are in UTC, computed from the schedule's time_of_day interpreted
 * in the paciente's timezone (e.g. 18:51 Europe/Madrid → 16:51 UTC).
 */
function generateScheduledTimes(
  timeOfDay: string, // "HH:MM"
  weekdayMask: number,
  timezoneId: string,
  daysAhead: number,
): Date[] {
  const results: Date[] = [];
  const now = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Compute the weekday in the schedule's timezone (not the host's)
    const dayOfWeek = getDayOfWeekInTimezone(year, month, day, timezoneId);
    if ((weekdayMask & (1 << dayOfWeek)) === 0) continue;

    // Parse time_of_day (HH:MM)
    const [hours, minutes] = timeOfDay.split(':').map(Number);

    // Build a "wall clock" string for the local time in the target timezone
    const pad = (n: number) => String(n).padStart(2, '0');
    const wallClock = `${year}-${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}:00`;

    // Convert wall-clock time in the target timezone to a real UTC Date
    const scheduledUtc = fromZonedTime(wallClock, timezoneId);
    results.push(scheduledUtc);
  }

  return results;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let created = 0;
  let skippedVacation = 0;
  let skippedExisting = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  try {
    // 1. Fetch all active schedules with their medication and paciente info
    const { data: schedules, error: schedulesError } = await supabase
      .from('schedules')
      .select(
        `
        id,
        time_of_day,
        weekday_mask,
        timezone_id,
        active,
        medications!inner (
          id,
          paciente_id,
          name,
          active,
          pacientes!inner (
            cuidador_id
          )
        )
      `,
      )
      .eq('active', true)
      .eq('medications.active', true);

    if (schedulesError) {
      throw new Error(`Failed to fetch schedules: ${schedulesError.message}`);
    }

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ status: 'ok', message: 'No active schedules found', created: 0 }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    const daysAhead = 7;

    for (const schedule of schedules) {
      const medication = schedule.medications;
      const pacienteId = medication.paciente_id;
      const medicationId = medication.id;
      // Use the paciente's primary caregiver as the registered_by. The
      // service-role client has no logged-in user, so getUser() would
      // return null and the tomas.registered_by FK would reject the row.
      const registeredBy = medication.pacientes.cuidador_id;

      // Generate scheduled times for the next 7 days
      const scheduledTimes = generateScheduledTimes(
        schedule.time_of_day,
        schedule.weekday_mask,
        schedule.timezone_id,
        daysAhead,
      );

      for (const scheduledAt of scheduledTimes) {
        // Check for vacation overlap
        const vacStart = new Date(scheduledAt.getTime() - 60_000).toISOString();
        const vacEnd = new Date(scheduledAt.getTime() + 60_000).toISOString();

        const hasVacation = await hasVacationOverlap(
          pacienteId,
          medicationId,
          vacStart,
          vacEnd,
        );

        if (hasVacation) {
          // Create a skipped toma with vacation reason
          const { error: upsertError } = await supabase
            .from('tomas')
            .upsert(
              {
                schedule_id: schedule.id,
                paciente_id: pacienteId,
                scheduled_at: scheduledAt.toISOString(),
                status: 'skipped',
                skip_reason: 'vacation',
                registered_by: registeredBy,
              },
              { onConflict: 'schedule_id,scheduled_at' },
            );

          if (upsertError) {
            errors++;
            errorDetails.push(`vacation-skip: ${upsertError.code ?? ''} ${upsertError.message}`);
            console.error(`Error creating vacation-skip toma: ${upsertError.message}`);
          } else {
            skippedVacation++;
          }
          continue;
        }

        // Create a pending toma (idempotent via unique constraint)
        const { error: upsertError } = await supabase
          .from('tomas')
          .upsert(
            {
              schedule_id: schedule.id,
              paciente_id: pacienteId,
              scheduled_at: scheduledAt.toISOString(),
              status: 'pending',
              registered_by: registeredBy,
            },
            { onConflict: 'schedule_id,scheduled_at' },
          );

        if (upsertError) {
          if (upsertError.code === '23505') {
            // Unique violation — already exists (shouldn't happen with onConflict, but safety)
            skippedExisting++;
          } else {
            errors++;
            errorDetails.push(`scheduled_at=${scheduledAt.toISOString()}: ${upsertError.code ?? ''} ${upsertError.message}`);
            console.error(`Error creating toma: ${upsertError.message}`);
          }
        } else {
          created++;
        }
      }
    }

    const elapsed = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: 'ok',
        summary: {
          totalSchedules: schedules.length,
          created,
          skippedVacation,
          skippedExisting,
          errors,
          elapsedMs: elapsed,
          errorDetails: errorDetails.slice(0, 5),
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ status: 'error', message, errors: errors + 1 }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
