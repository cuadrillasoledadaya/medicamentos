-- Migration 0023: extend tomas_due_for_push to surface snoozed-expired tomas
-- Mutually exclusive guards ensure a row is returned at most once:
--   branch A: original 5-min window (snoozed_until IS NULL)
--   branch B: 1-min grace around snoozed_until expiry (snoozed_until IS NOT NULL)
-- Idempotent: CREATE OR REPLACE VIEW.

create or replace view public.tomas_due_for_push as
select
  t.id as toma_id,
  t.paciente_id,
  t.scheduled_at,
  m.name as medication_name,
  m.dose_value,
  m.dose_unit,
  p.name as paciente_name
from public.tomas t
join public.schedules s on s.id = t.schedule_id
join public.medications m on m.id = s.medication_id
join public.pacientes p on p.id = t.paciente_id
where t.status = 'pending'
  and (
    ( t.snoozed_until is null
      and t.scheduled_at <= now()
      and t.scheduled_at >  now() - interval '5 minutes'
    )
    or
    ( t.snoozed_until is not null
      and t.snoozed_until <= now()
      and t.snoozed_until >  now() - interval '1 minute'
    )
  );
