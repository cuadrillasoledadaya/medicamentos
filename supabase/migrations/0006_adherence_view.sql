-- 0006: Adherence 28-day rolling view.
-- Creates v_adherence_28d for the adherence dashboard widget and detail page.
-- Idempotent: uses CREATE OR REPLACE VIEW.

create or replace view public.v_adherence_28d as
with days as (
  select generate_series(current_date - 27, current_date, '1 day')::date as d
),
per_paciente as (
  select
    t.paciente_id,
    date(t.scheduled_at at time zone coalesce(p.timezone_id, 'UTC')) as d,
    count(*) filter (where t.status = 'taken_on_time') as on_time,
    count(*) filter (where t.status = 'taken_late')    as late,
    count(*) filter (where t.status = 'missed')        as missed,
    count(*) filter (where t.status = 'skipped' and coalesce(t.skip_reason, '') <> 'vacation') as skipped
  from tomas t
  join pacientes p on p.id = t.paciente_id
  where t.scheduled_at >= current_date - interval '28 days'
  group by t.paciente_id, d
)
select
  d.d::date as date,
  pp.paciente_id,
  pp.on_time,
  pp.late,
  pp.missed,
  pp.skipped,
  case
    when (pp.on_time + pp.late + pp.missed + pp.skipped) = 0 then null
    else pp.on_time::numeric / (pp.on_time + pp.late + pp.missed + pp.skipped)
  end as adherence_pct
from days d
left join per_paciente pp on pp.d = d.d;
