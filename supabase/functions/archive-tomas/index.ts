// archive-tomas — Edge Function stub (FEATURE-FLAGGED OFF in v1).
//
// This function contains the SQL logic for the nightly archive job but is NOT
// scheduled via pg_cron or any active trigger in v1.
//
// To enable in a future version:
// 1. Deploy this function: supabase functions deploy archive-tomas
// 2. Add a pg_cron entry that calls this function nightly at 00:30 UTC
// 3. Monitor the archive run via logs
//
// DO NOT schedule this function until the product team explicitly enables archival.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// FEATURE FLAG: set to true to enable archival in production
const ARCHIVE_ENABLED = false;

Deno.serve(async (req) => {
  if (!ARCHIVE_ENABLED) {
    return new Response(
      JSON.stringify({ status: 'disabled', message: 'Archive job is feature-flagged OFF in v1.' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Step 1: Archive old tomas (move to tomas_archive, delete from tomas)
    // Uses per-paciente retention_days if exists, else global default.
    // Excludes tomas linked to closed temporadas.
    const { error: archiveError } = await supabase.rpc('archive_old_tomas');
    if (archiveError) throw archiveError;

    // Step 2: Hard-delete ancient archive rows (> 36 months)
    const { error: purgeError } = await supabase.rpc('purge_ancient_archive');
    if (purgeError) throw purgeError;

    return new Response(
      JSON.stringify({ status: 'success', message: 'Archive run completed.' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

/*
-- SQL functions to be created in a migration when enabling archival:
-- These are referenced by the Edge Function above.

create or replace function public.archive_old_tomas() returns void
  language plpgsql security definer set search_path = public as $$
declare
  policy record;
begin
  -- Iterate over each paciente with a retention policy (or global default)
  for policy in
    select coalesce(rp.paciente_id, 'global') as pid,
           rp.retention_days
    from retention_policies rp
    where rp.paciente_id is not null
    union all
    select 'global' as pid, retention_days
    from retention_policies where paciente_id is null
    limit 1
  loop
    if policy.pid = 'global' then
      -- Archive tomas for pacientes without a specific policy
      insert into tomas_archive (id, schedule_id, paciente_id, scheduled_at, status, taken_at, snoozed_until, skip_reason, registered_by, notes, created_at, updated_at)
      select t.id, t.schedule_id, t.paciente_id, t.scheduled_at, t.status, t.taken_at, t.snoozed_until, t.skip_reason, t.registered_by, t.notes, t.created_at, t.updated_at
      from tomas t
      where t.scheduled_at < now() - (policy.retention_days || ' days')::interval
        and not exists (
          select 1 from plans p join temporadas temp on p.temporada_id = temp.id
          where temp.closed_at is not null
        )
        and t.paciente_id not in (select paciente_id from retention_policies where paciente_id is not null);

      delete from tomas
      where scheduled_at < now() - (policy.retention_days || ' days')::interval
        and not exists (
          select 1 from plans p join temporadas temp on p.temporada_id = temp.id
          where temp.closed_at is not null
        )
        and t.paciente_id not in (select paciente_id from retention_policies where paciente_id is not null);
    else
      -- Archive tomas for this specific paciente
      insert into tomas_archive (id, schedule_id, paciente_id, scheduled_at, status, taken_at, snoozed_until, skip_reason, registered_by, notes, created_at, updated_at)
      select t.id, t.schedule_id, t.paciente_id, t.scheduled_at, t.status, t.taken_at, t.snoozed_until, t.skip_reason, t.registered_by, t.notes, t.created_at, t.updated_at
      from tomas t
      where t.paciente_id = policy.pid::uuid
        and t.scheduled_at < now() - (policy.retention_days || ' days')::interval
        and not exists (
          select 1 from plans p join temporadas temp on p.temporada_id = temp.id
          where temp.closed_at is not null
        );

      delete from tomas
      where tomas.paciente_id = policy.pid::uuid
        and tomas.scheduled_at < now() - (policy.retention_days || ' days')::interval
        and not exists (
          select 1 from plans p join temporadas temp on p.temporada_id = temp.id
          where temp.closed_at is not null
        );
    end if;
  end loop;
end;
$$;

create or replace function public.purge_ancient_archive() returns void
  language plpgsql security definer set search_path = public as $$
begin
  delete from tomas_archive
  where archived_at < now() - interval '1095 days';  -- 36 months
end;
$$;
*/
