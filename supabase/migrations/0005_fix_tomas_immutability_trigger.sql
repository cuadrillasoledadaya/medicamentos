-- 0005_fix_tomas_immutability_trigger.sql
--
-- Bug: prevent_closed_temporada_mutation() read NEW.temporada_id / OLD.temporada_id
-- unconditionally. The tomas table does NOT have a temporada_id column (only plans
-- does), so the cascaded DELETE on tomas (triggered by deleting a medication, which
-- cascades to schedules, which cascades to tomas) raised 42703
--   "record 'new' has no field 'temporada_id'"
-- and surfaced as a 400 Bad Request to the Supabase REST client.
--
-- Fix: make the function tolerate tables that don't carry temporada_id. The
-- closed-temporada immutability check still applies to plans (and any other table
-- that gains temporada_id later), it just no-ops on tables without it.
--
-- This is idempotent (CREATE OR REPLACE) and does not change any RLS or schema.

create or replace function public.prevent_closed_temporada_mutation() returns trigger
  language plpgsql as $$
declare
  v_tid uuid;
  v_closed_at timestamptz;
  v_has_audit boolean;
  v_has_temporada_id boolean;
begin
  -- Guard: tables without a temporada_id column (e.g. tomas) skip this check.
  -- We detect the column via to_jsonb so the function stays portable across tables.
  if tg_op = 'DELETE' then
    v_has_temporada_id := (to_jsonb(OLD) ? 'temporada_id');
  else
    v_has_temporada_id := (to_jsonb(NEW) ? 'temporada_id');
  end if;

  if not v_has_temporada_id then
    return case when tg_op = 'DELETE' then OLD else NEW end;
  end if;

  v_tid := coalesce(NEW.temporada_id, OLD.temporada_id);
  if v_tid is null then
    return case when tg_op = 'DELETE' then OLD else NEW end;
  end if;

  select closed_at into v_closed_at from temporadas where id = v_tid;
  if v_closed_at is null then
    -- Temporada is still open; allow.
    return case when tg_op = 'DELETE' then OLD else NEW end;
  end if;

  -- Within 90-day window: allow with no audit required.
  if v_closed_at > now() - interval '90 days' then
    return case when tg_op = 'DELETE' then OLD else NEW end;
  end if;

  -- Check for a reopen audit row.
  select exists (
    select 1 from temporada_reopen_audit
    where temporada_id = v_tid and length(reason) >= 10
  ) into v_has_audit;

  if v_has_audit then
    return case when tg_op = 'DELETE' then OLD else NEW end;
  end if;

  raise exception
    'Temporada % is closed and past the 90-day immutability window. '
    'Reopen with a reason via temporada_reopen_audit before modifying.',
    v_tid;
end;
$$;
