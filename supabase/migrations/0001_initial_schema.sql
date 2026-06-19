-- medications PWA v1 — run against an empty Supabase Postgres DB.
-- Source of truth: openspec/changes/medication-tracker-pwa/specs/schema/spec.md
-- Amendments: Q5=C (temporada reopen audit), Q4=B (travel adjustments).

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";   -- for tstzrange exclusion on vacations

-- ---------------------------------------------------------------------------
-- 5.1 RLS helpers (SECURITY DEFINER breaks family_members self-reference recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_active_family_member(p_paciente uuid)
  returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from family_members
    where paciente_id = p_paciente and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_cuidador_principal(p_paciente uuid)
  returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from family_members
    where paciente_id = p_paciente and user_id = auth.uid()
      and role = 'cuidador_principal' and status = 'active'
  );
$$;

create or replace function public.paciente_of_medication(p_medication uuid)
  returns uuid language sql security definer stable set search_path = public as $$
  select paciente_id from medications where id = p_medication limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 5.2 Enums
-- ---------------------------------------------------------------------------
create type intake_status           as enum ('pending','taken_on_time','taken_late','skipped','missed');
create type interaction_severity    as enum ('info','caution','warning','severe');
create type family_role             as enum ('owner_paciente','cuidador_principal','cuidador_secundario','medico');
create type family_membership_state as enum ('pending','active','revoked');
create type notification_channel    as enum ('in_app','email','sms');

-- ---------------------------------------------------------------------------
-- 5.3 Tables
-- ---------------------------------------------------------------------------

-- Pacientes
create table pacientes (
  id uuid primary key default gen_random_uuid(),
  cuidador_id uuid not null references auth.users(id),
  name text not null,
  dob date,
  photo_url text,
  timezone_id text not null default 'America/Buenos_Aires',
  created_at timestamptz not null default now()
);
create index pacientes_cuidador_idx on pacientes(cuidador_id);

-- Family members
create table family_members (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role family_role not null,
  status family_membership_state not null default 'pending',
  created_at timestamptz not null default now()
);
create unique index family_members_unique_active
  on family_members(paciente_id, user_id) where status = 'active';
create index family_members_user_status_idx on family_members(user_id, status);

-- Temporadas (treatment periods)
create table temporadas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint temporadas_end_after_start check (end_date >= start_date)
);
create unique index temporadas_one_open_per_paciente
  on temporadas(paciente_id) where closed_at is null;

-- Plans (permanent or seasonal)
create table plans (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  temporada_id uuid references temporadas(id) on delete set null,
  is_permanent boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  constraint plans_permanent_no_temporada check (
    (is_permanent = true  and temporada_id is null) or (is_permanent = false)
  )
);
create index plans_paciente_idx  on plans(paciente_id);
create index plans_temporada_idx on plans(temporada_id);

-- Medications
create table medications (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  name text not null,
  dose_value numeric not null check (dose_value > 0),
  dose_unit text not null,
  dose_unit_other text,
  route text not null,
  frequency_hint text,
  notes text,
  photo_url text,
  stock_estimate integer not null default 0 check (stock_estimate >= 0),
  low_stock_threshold integer not null default 7 check (low_stock_threshold >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medications_unit_other check (
    (dose_unit = 'other' and dose_unit_other is not null) or (dose_unit <> 'other')
  )
);
create index medications_paciente_idx        on medications(paciente_id);
create index medications_paciente_active_idx on medications(paciente_id) where active;

-- Schedules
create table schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications(id) on delete cascade,
  time_of_day time not null,
  weekday_mask integer not null check (weekday_mask between 0 and 127),
  timezone_id text not null default 'America/Buenos_Aires',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index schedules_medication_active_idx on schedules(medication_id) where active;

-- Tomas (intake events)
create table tomas (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  scheduled_at timestamptz not null,
  status intake_status not null default 'pending',
  taken_at timestamptz,
  snoozed_until timestamptz,
  skip_reason text,
  registered_by uuid not null references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tomas_unique_slot unique (schedule_id, scheduled_at)
);
create index tomas_paciente_scheduled_idx on tomas(paciente_id, scheduled_at desc);
create index tomas_paciente_status_idx    on tomas(paciente_id, status);

-- Tomas archive (mirrors tomas + archived_at)
create table tomas_archive (
  id uuid primary key,
  schedule_id uuid not null references schedules(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null,
  taken_at timestamptz,
  snoozed_until timestamptz,
  skip_reason text,
  registered_by uuid not null references auth.users(id),
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz not null default now()
);
create index tomas_archive_paciente_scheduled_idx on tomas_archive(paciente_id, scheduled_at);
create index tomas_archive_archived_idx            on tomas_archive(archived_at);

-- Vacations (pause mode) — BINDING DECISION #1
-- EXCLUDE USING gist with tstzrange '[)' detects overlap across an unbounded set;
-- back-to-back ranges are NOT overlapping. Partial constraints via WHERE clause.
create table vacations (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  medication_id uuid references medications(id) on delete cascade,  -- NULL = GLOBAL
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint vacations_end_after_start check (ends_at > starts_at),
  constraint vacations_no_overlap_global
    exclude using gist (
      paciente_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (medication_id is null),
  constraint vacations_no_overlap_per_medication
    exclude using gist (
      medication_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (medication_id is not null)
);
create index vacations_paciente_range_idx on vacations(paciente_id, starts_at, ends_at);

-- Retention policies
create table retention_policies (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete cascade,  -- NULL = global default
  retention_days integer not null default 730 check (retention_days > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retention_policies_unique_paciente
  on retention_policies(paciente_id) where paciente_id is not null;

-- Notification settings — BINDING DECISION #3 (separate table)
create table notification_settings (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  medication_id uuid references medications(id) on delete cascade,  -- NULL = paciente-wide
  channel notification_channel not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_settings_unique unique (paciente_id, medication_id, channel)
);
create index notification_settings_lookup_idx on notification_settings(paciente_id, medication_id);

-- Interactions (curated conflict pairs)
create table interactions (
  id uuid primary key default gen_random_uuid(),
  drug_a text not null,
  drug_b text not null,
  severity interaction_severity not null,
  description text not null,
  source_notes text,
  created_at timestamptz not null default now(),
  constraint interactions_canonical_order check (drug_a < drug_b),
  constraint interactions_unique_pair unique (drug_a, drug_b)
);

-- Stock adjustments (audit trail)
create table stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications(id) on delete cascade,
  previous_estimate integer not null,
  new_estimate integer not null,
  reason text not null,
  adjusted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index stock_adjustments_medication_idx on stock_adjustments(medication_id);

-- Adherence daily — BINDING DECISION #2 (table created empty; rollup function NOT deployed in v1)
create table adherence_daily (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  date date not null,
  taken_on_time integer not null default 0,
  taken_late    integer not null default 0,
  missed        integer not null default 0,
  skipped       integer not null default 0,
  rollup_computed_at timestamptz not null default now(),
  constraint adherence_daily_unique unique (paciente_id, date)
);
-- v2 rollup (DO NOT DEPLOY in v1):
-- create or replace function public.compute_adherence_daily(p_date date) returns void
--   language plpgsql security definer set search_path = public as $$ begin
--     insert into adherence_daily (paciente_id, date, taken_on_time, taken_late, missed, skipped)
--     select paciente_id, p_date,
--       count(*) filter (where status = 'taken_on_time'),
--       count(*) filter (where status = 'taken_late'),
--       count(*) filter (where status = 'missed'),
--       count(*) filter (where status = 'skipped' and coalesce(skip_reason,'') <> 'vacation')
--     from tomas where scheduled_at::date = p_date
--     group by paciente_id
--     on conflict (paciente_id, date) do update set
--       taken_on_time = excluded.taken_on_time, taken_late = excluded.taken_late,
--       missed = excluded.missed, skipped = excluded.skipped, rollup_computed_at = now();
-- end; $$;

-- ---------------------------------------------------------------------------
-- Q5=C: Temporada reopen audit table
-- ---------------------------------------------------------------------------
-- Allows owner_paciente or cuidador_principal to reopen a closed temporada
-- after the 90-day immutability window, with a mandatory reason.
create table temporada_reopen_audit (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references temporadas(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  reason text not null check (length(reason) >= 10),
  modified_at timestamptz not null default now(),
  modified_fields jsonb not null default '{}'::jsonb
);
create index idx_temporada_reopen_audit_temporada on temporada_reopen_audit(temporada_id);

-- ---------------------------------------------------------------------------
-- Q4=B: Patient trip adjustments (per-trip manual TZ shift)
-- ---------------------------------------------------------------------------
-- The application layer reads this table to apply a temporary time shift
-- to tomas computed during the trip window. This is a lightweight alternative
-- to changing the paciente's timezone_id for short trips.
create table patient_trip_adjustments (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  shift_hours numeric(4,2) not null check (shift_hours between -23.99 and 23.99),
  reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index idx_patient_trip_adjustments_paciente
  on patient_trip_adjustments(paciente_id, starts_at desc);

-- ---------------------------------------------------------------------------
-- Dose units seed table
-- ---------------------------------------------------------------------------
create table dose_units (
  value text primary key,
  sort_order integer not null
);
insert into dose_units(value, sort_order) values
  ('mg',10),('ml',20),('gotas',30),('UI',40),('comprimidos',50),
  ('parches',60),('sobres',70),('cucharadas',80),('aplicaciones',90),
  ('inyecciones',100),('otro',999);

-- Interaction severity seed values (informational; enum already constrains)
create table interaction_severity_values (value text primary key, label text not null);
insert into interaction_severity_values(value, label) values
  ('info','Información'),('caution','Precaución'),('warning','Advertencia'),('severe','Severo');

-- Family role seed values
create table family_role_values (value text primary key, label text not null);
insert into family_role_values(value, label) values
  ('owner_paciente','Paciente (dueño)'),
  ('cuidador_principal','Cuidador principal'),
  ('cuidador_secundario','Cuidador secundario'),
  ('medico','Médico');

-- ---------------------------------------------------------------------------
-- 5.4 Triggers
-- ---------------------------------------------------------------------------

-- (a) Conditional immutability for closed temporadas (Q5=C amendment)
-- Allows modifications only if:
--   1. The temporada is still OPEN (closed_at IS NULL), OR
--   2. The closed_at is within the last 90 days (warning but allow), OR
--   3. A corresponding row in temporada_reopen_audit exists with a non-empty reason.
create or replace function public.prevent_closed_temporada_mutation() returns trigger language plpgsql as $$
declare
  v_tid uuid;
  v_closed_at timestamptz;
  v_has_audit boolean;
begin
  v_tid := coalesce(NEW.temporada_id, OLD.temporada_id);
  if v_tid is null then return coalesce(NEW, OLD); end if;

  select closed_at into v_closed_at from temporadas where id = v_tid;
  if v_closed_at is null then
    -- Temporada is still open; allow.
    return coalesce(NEW, OLD);
  end if;

  -- Within 90-day window: allow with no audit required.
  if v_closed_at > now() - interval '90 days' then
    return coalesce(NEW, OLD);
  end if;

  -- Check for a reopen audit row.
  select exists (
    select 1 from temporada_reopen_audit
    where temporada_id = v_tid and length(reason) >= 10
  ) into v_has_audit;

  if v_has_audit then
    return coalesce(NEW, OLD);
  end if;

  raise exception
    'Temporada % is closed and past the 90-day immutability window. '
    'Reopen with a reason via temporada_reopen_audit before modifying.',
    v_tid;
end;
$$;

create trigger plans_immutability
  before update or delete on plans
  for each row execute function public.prevent_closed_temporada_mutation();

create trigger tomas_immutability
  before update or delete on tomas
  for each row execute function prevent_closed_temporada_mutation();

-- (b) Stock decrement on toma taken
create or replace function public.decrement_stock_on_taken() returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and NEW.status in ('taken_on_time','taken_late')
      and OLD.status is distinct from NEW.status) then
    update medications
    set stock_estimate = greatest(0, stock_estimate - 1), updated_at = now()
    where id = (select medication_id from schedules where id = NEW.schedule_id);
  end if;
  return NEW;
end;
$$;

create trigger tomas_decrement_stock
  after update on tomas
  for each row execute function public.decrement_stock_on_taken();

-- (c) Stock adjustment audit
create or replace function public.audit_stock_adjustment() returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and NEW.stock_estimate is distinct from OLD.stock_estimate) then
    insert into stock_adjustments (medication_id, previous_estimate, new_estimate, reason, adjusted_by)
    values (NEW.id, OLD.stock_estimate, NEW.stock_estimate,
            coalesce(NEW.notes, 'manual adjustment'), auth.uid());
  end if;
  return NEW;
end;
$$;

create trigger medications_stock_audit
  after update on medications
  for each row execute function public.audit_stock_adjustment();

-- ---------------------------------------------------------------------------
-- 5.5 RLS
-- ---------------------------------------------------------------------------
-- ALTER TABLE in Postgres operates on ONE table per statement; comma-separated
-- lists are NOT supported. Enable RLS on each table individually.
alter table pacientes                enable row level security;
alter table family_members           enable row level security;
alter table temporadas               enable row level security;
alter table plans                    enable row level security;
alter table medications              enable row level security;
alter table schedules                enable row level security;
alter table tomas                    enable row level security;
alter table tomas_archive            enable row level security;
alter table vacations                enable row level security;
alter table retention_policies       enable row level security;
alter table notification_settings    enable row level security;
alter table interactions             enable row level security;
alter table stock_adjustments        enable row level security;
alter table adherence_daily          enable row level security;
alter table temporada_reopen_audit   enable row level security;
alter table patient_trip_adjustments enable row level security;

-- Pacientes
create policy pacientes_read  on pacientes for select
  using (cuidador_id = auth.uid() or is_active_family_member(id));
create policy pacientes_write on pacientes for all
  using (cuidador_id = auth.uid())
  with check (cuidador_id = auth.uid());

-- Family members
create policy family_members_read  on family_members for select
  using (user_id = auth.uid() or is_active_family_member(paciente_id));
create policy family_members_write on family_members for all
  using (is_cuidador_principal(paciente_id))
  with check (is_cuidador_principal(paciente_id));

-- Six tables share the read=family / write=cuidador_principal pattern
do $$ declare t text; begin
  for t in select unnest(array['temporadas','plans','medications','vacations','notification_settings']) loop
    execute format(
      'create policy %I_read  on %I for select using (is_active_family_member(paciente_id))', t, t);
    execute format(
      'create policy %I_write on %I for all using (is_cuidador_principal(paciente_id)) '
      'with check (is_cuidador_principal(paciente_id))', t, t);
  end loop;
end; $$;

-- Retention policies: NULL-paciente = global default
create policy retention_policies_read  on retention_policies for select
  using (paciente_id is null or is_active_family_member(paciente_id));
create policy retention_policies_write on retention_policies for all
  using (paciente_id is null or is_cuidador_principal(paciente_id))
  with check (paciente_id is null or is_cuidador_principal(paciente_id));

-- Schedules / stock_adjustments resolve paciente via medications
create policy schedules_read          on schedules        for select
  using (is_active_family_member(paciente_of_medication(medication_id)));
create policy schedules_write         on schedules        for all
  using (is_cuidador_principal(paciente_of_medication(medication_id)))
  with check (is_cuidador_principal(paciente_of_medication(medication_id)));
create policy stock_adjustments_read  on stock_adjustments for select
  using (is_active_family_member(paciente_of_medication(medication_id)));
create policy stock_adjustments_write on stock_adjustments for all
  using (is_cuidador_principal(paciente_of_medication(medication_id)))
  with check (is_cuidador_principal(paciente_of_medication(medication_id)));

-- Tomas: any active family member INSERTs; UPDATE by cuidador_principal, registered_by, or owner_paciente
create policy tomas_read   on tomas for select
  using (is_active_family_member(paciente_id));
create policy tomas_insert on tomas for insert
  with check (is_active_family_member(paciente_id) and registered_by = auth.uid());
create policy tomas_update on tomas for update
  using (
    is_cuidador_principal(paciente_id)
    or registered_by = auth.uid()
    or exists (
      select 1 from family_members fm
      where fm.paciente_id = tomas.paciente_id
        and fm.user_id = auth.uid() and fm.role = 'owner_paciente' and fm.status = 'active'
    )
  );

-- Tomas archive / adherence_daily: read only (writes via SECURITY DEFINER Edge Function)
create policy tomas_archive_read  on tomas_archive  for select
  using (is_active_family_member(paciente_id));
create policy adherence_daily_read on adherence_daily for select
  using (is_active_family_member(paciente_id));

-- Interactions: any authenticated (v1: tighten when platform-admin role lands)
create policy interactions_read  on interactions for select
  using (auth.role() = 'authenticated');
create policy interactions_write on interactions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Q5=C: Temporada reopen audit — only cuidador_principal and owner_paciente can insert/read
create policy temporada_reopen_audit_insert on temporada_reopen_audit for insert
  with check (
    is_cuidador_principal(temporada_id)
    or exists (
      select 1 from family_members fm
      join temporadas tr on tr.id = temporada_reopen_audit.temporada_id
      where fm.paciente_id = tr.paciente_id
        and fm.user_id = auth.uid()
        and fm.role = 'owner_paciente'
        and fm.status = 'active'
    )
  );
create policy temporada_reopen_audit_read on temporada_reopen_audit for select
  using (
    is_cuidador_principal(
      (select paciente_id from temporadas where id = temporada_reopen_audit.temporada_id)
    )
    or exists (
      select 1 from family_members fm
      join temporadas tr on tr.id = temporada_reopen_audit.temporada_id
      where fm.paciente_id = tr.paciente_id
        and fm.user_id = auth.uid()
        and fm.role = 'owner_paciente'
        and fm.status = 'active'
    )
  );

-- Q4=B: Patient trip adjustments — cuidador_principal inserts; family reads
create policy patient_trip_adjustments_insert on patient_trip_adjustments for insert
  with check (is_cuidador_principal(paciente_id));
create policy patient_trip_adjustments_read on patient_trip_adjustments for select
  using (is_active_family_member(paciente_id));

-- ---------------------------------------------------------------------------
-- 5.6 Adherence view (v1: computed on demand, no precomputed rollup)
-- ---------------------------------------------------------------------------
create or replace view v_adherence_28d as
with days as (
  select generate_series(current_date - 27, current_date, '1 day')::date as d
),
per_paciente as (
  select t.paciente_id,
         date(t.scheduled_at at time zone coalesce(p.timezone_id,'UTC')) as d,
         count(*) filter (where t.status = 'taken_on_time') as on_time,
         count(*) filter (where t.status = 'taken_late')    as late,
         count(*) filter (where t.status = 'missed')        as missed,
         count(*) filter (where t.status = 'skipped' and coalesce(t.skip_reason,'') <> 'vacation') as skipped
  from tomas t
  join pacientes p on p.id = t.paciente_id
  where t.scheduled_at >= current_date - interval '28 days'
  group by t.paciente_id, d
)
select d.d::date as date,
       pp.paciente_id,
       pp.on_time, pp.late, pp.missed, pp.skipped,
       case when (pp.on_time + pp.late + pp.missed + pp.skipped) = 0 then null
            else pp.on_time::numeric / (pp.on_time + pp.late + pp.missed + pp.skipped)
       end as adherence_pct
from days d
left join per_paciente pp on pp.d = d.d;

-- ---------------------------------------------------------------------------
-- 5.7 Tomas-due view (used by notification trigger)
-- ---------------------------------------------------------------------------
create view tomas_due as
select t.id, t.paciente_id, t.schedule_id, t.scheduled_at, t.status
from tomas t
where t.status = 'pending';
