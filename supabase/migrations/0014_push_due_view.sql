-- Migration 0014: tomas_due_for_push view
--
-- Helper view that identifies tomas due for push delivery within a 5-minute
-- delivery window. Joins tomas + medications + pacientes to provide all
-- fields needed by the push payload contract.
--
-- Used by:
--   - pg_cron job (materialize_due_pushes) to find due tomas
--   - Developers for debugging push delivery timing
--
-- Columns:
--   toma_id         — tomas.id
--   paciente_id     — tomas.paciente_id
--   scheduled_at    — when the toma was scheduled
--   medication_name — medications.name
--   dose_value      — medications.dose_value
--   dose_unit       — medications.dose_unit
--   paciente_name   — pacientes.name

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
  and t.scheduled_at <= now()
  and t.scheduled_at > now() - interval '5 minutes';
