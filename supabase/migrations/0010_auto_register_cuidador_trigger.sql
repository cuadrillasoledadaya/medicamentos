-- Migration 0010: Auto-register paciente owner as cuidador_principal
-- in family_members via a DB trigger.
--
-- Background: The application code in src/features/pacientes/api.ts
-- tried to insert a family_members row right after creating a
-- paciente, but if the insert failed (e.g., due to a transient RLS
-- or constraint issue), the failure was logged with console.warn
-- and not surfaced to the user. The user was left with a paciente
-- but no family_member row, which broke every downstream RLS check
-- (is_cuidador_principal and is_active_family_member both read from
-- family_members), so the user could not insert any medications,
-- schedules, plans, etc.
--
-- Fix: move the auto-registration into a Postgres trigger that fires
-- after insert on pacientes. The trigger runs as security definer
-- (postgres role) so it bypasses the family_members_write RLS policy
-- (which has the bootstrap chicken-and-egg). The ON CONFLICT clause
-- makes the trigger safe against re-runs and against any client-side
-- inserts that might still try to create the same row.
--
-- Idempotent: re-running this migration is safe. The trigger is
-- created with IF NOT EXISTS semantics by first dropping it.

-- ---------------------------------------------------------------------------
-- 1. Trigger function
-- ---------------------------------------------------------------------------
create or replace function public.fn_pacientes_auto_register_cuidador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into family_members (paciente_id, user_id, role, status)
  values (
    new.id,
    new.cuidador_id,
    'cuidador_principal'::family_role,
    'active'::family_membership_state
  )
  on conflict (paciente_id, user_id) where status = 'active' do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Trigger (idempotent: drop if exists, then create)
-- ---------------------------------------------------------------------------
drop trigger if exists trg_pacientes_auto_register_cuidador on public.pacientes;

create trigger trg_pacientes_auto_register_cuidador
  after insert on public.pacientes
  for each row execute function public.fn_pacientes_auto_register_cuidador();

-- ---------------------------------------------------------------------------
-- 3. One-time backfill: any existing paciente that does not have a
--    family_member row for its cuidador_id gets one now. This unblocks
--    the current state (post-truncate, where the user created a
--    paciente but the client-side family_member insert silently failed).
-- ---------------------------------------------------------------------------
insert into family_members (paciente_id, user_id, role, status)
select p.id, p.cuidador_id, 'cuidador_principal'::family_role, 'active'::family_membership_state
from public.pacientes p
where not exists (
  select 1 from public.family_members fm
  where fm.paciente_id = p.id
    and fm.user_id = p.cuidador_id
    and fm.status = 'active'
);
