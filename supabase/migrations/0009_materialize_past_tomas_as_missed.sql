-- Migration 0009: Materialize past tomas as 'missed' instead of skipping them
--
-- User-reported issue: when a schedule is created for a time that is already
-- in the past on the same day, the materialize_tomas function skipped the
-- day's toma entirely. This made the medication invisible in the Dashboard
-- "Recordatorios de hoy" banner (which queries by scheduled_at range), so
-- the user could not tell whether the schedule was actually saved.
--
-- New behavior: always materialize a toma for today, but with status 'missed'
-- when the scheduled time has already passed (and not on vacation). This way:
--   - The Dashboard banner shows the medication for that day
--   - The user can see the missed status and know to address it
--   - The model reflects reality (the dose was not taken)
--
-- Vacation overrides the missed/pending decision: if the patient has a
-- vacation on the scheduled slot, the toma is still 'skipped' with reason
-- 'vacation' regardless of whether the time has passed.
--
-- This migration is a `create or replace` of the existing function plus a
-- one-time backfill that re-runs materialize_tomas so existing schedules
-- that lost today's toma to the old skip logic now get a 'missed' row.

-- ---------------------------------------------------------------------------
-- 1. Updated materialize_tomas function
-- ---------------------------------------------------------------------------
create or replace function public.materialize_tomas(days_ahead int default 7)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created int := 0;
  v_skipped_vacation int := 0;
  v_skipped_existing int := 0;
  v_status text;
  v_schedule record;
  v_target_date date;
  v_target_dow int;
  v_target_ts timestamptz;
  v_local_ts timestamp;
  v_now date := current_date;
begin
  -- Iterate over every active schedule joined to its active medication
  -- and the medication's paciente (for cuidador_id as registered_by).
  for v_schedule in
    select
      s.id            as schedule_id,
      s.time_of_day   as time_of_day,
      s.weekday_mask  as weekday_mask,
      s.timezone_id   as timezone_id,
      m.id            as medication_id,
      m.paciente_id   as paciente_id,
      p.cuidador_id   as cuidador_id
    from schedules s
    join medications m on m.id = s.medication_id and m.active = true
    join pacientes   p on p.id = m.paciente_id
    where s.active = true
  loop
    for i in 0..(days_ahead - 1) loop
      v_target_date := v_now + i;

      -- Day of week in the schedule's timezone.
      -- We use the date's local weekday under the target timezone by
      -- reading the weekday at noon in that TZ. (At noon avoids DST
      -- midnight edge cases for the weekday read.)
      v_target_dow := extract(
        dow from (v_target_date::text || ' 12:00:00')::timestamp
                 at time zone coalesce(v_schedule.timezone_id, 'UTC')
      )::int;

      -- Check if this weekday is in the weekday_mask (Sun=0 bit, Mon=1 bit, ...)
      if (v_schedule.weekday_mask & (1 << v_target_dow)) = 0 then
        continue;
      end if;

      -- Build a local timestamp (no TZ) for this date + time_of_day,
      -- then convert to timestamptz in the schedule's timezone.
      v_local_ts := (v_target_date::text || ' ' || v_schedule.time_of_day)::timestamp;
      v_target_ts := v_local_ts at time zone coalesce(v_schedule.timezone_id, 'UTC');

      -- Determine the default status for this toma:
      --   - If the slot is already in the past for today: 'missed'
      --     (so the user sees the medication in the Dashboard and can
      --     address it; the schedule is still active and the next slot
      --     will be 'pending').
      --   - Otherwise: 'pending' (default).
      v_status := 'pending';
      if i = 0 and v_target_ts <= now() then
        v_status := 'missed';
      end if;

      -- Check for an active vacation (global or per-medication).
      if exists (
        select 1 from vacations v
        where v.paciente_id = v_schedule.paciente_id
          and (v.medication_id is null or v.medication_id = v_schedule.medication_id)
          and v.starts_at <= v_target_ts
          and v.ends_at   >= v_target_ts
      ) then
        -- Vacation: insert a skipped toma. The adherence view excludes
        -- these from the denominator, so they don't count against the
        -- patient. Vacation overrides missed/pending for today.
        insert into tomas (
          schedule_id, paciente_id, scheduled_at, status, skip_reason, registered_by
        ) values (
          v_schedule.schedule_id, v_schedule.paciente_id, v_target_ts,
          'skipped', 'vacation', v_schedule.cuidador_id
        )
        on conflict (schedule_id, scheduled_at) do nothing;
        v_skipped_vacation := v_skipped_vacation + 1;
      else
        -- Normal: insert with the determined status.
        insert into tomas (
          schedule_id, paciente_id, scheduled_at, status, registered_by
        ) values (
          v_schedule.schedule_id, v_schedule.paciente_id, v_target_ts,
          v_status, v_schedule.cuidador_id
        )
        on conflict (schedule_id, scheduled_at) do nothing;
        if v_status = 'missed' then
          v_created := v_created + 1;
        else
          v_created := v_created + 1;
        end if;
      end if;
    end loop;
  end loop;

  raise notice 'materialize_tomas: created=%, skipped_vacation=%', v_created, v_skipped_vacation;
  return v_created;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. One-time backfill: re-run materialize_tomas so any schedule whose
--    today's toma was dropped by the old skip-past logic now gets a
--    'missed' row. This is idempotent (ON CONFLICT DO NOTHING in the
--    function), so future pg_cron runs are unaffected.
-- ---------------------------------------------------------------------------
select public.materialize_tomas(7);
