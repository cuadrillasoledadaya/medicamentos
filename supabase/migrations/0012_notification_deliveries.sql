-- Migration 0012: notification_deliveries table
--
-- Delivery audit log for every push/email/SMS attempt.
-- Records per (toma, subscription, channel, attempt).
--
-- Columns:
--   id              — UUID primary key
--   toma_id         — FK to tomas (which dose triggered this)
--   subscription_id — FK to push_subscriptions (which device received it)
--   channel         — text: 'web_push', 'email', 'sms', 'in_app'
--   sent_at         — When the delivery was attempted
--   status          — 'success' or 'failure' (check constraint)
--   error_message   — Nullable; contains response code or error on failure

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  toma_id uuid not null references public.tomas(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  channel text not null,
  sent_at timestamptz not null default now(),
  status text not null check (status in ('success', 'failure')),
  error_message text
);

create index notification_deliveries_toma_id_idx on notification_deliveries(toma_id);
create index notification_deliveries_subscription_id_idx on notification_deliveries(subscription_id);
create index notification_deliveries_sent_at_idx on notification_deliveries(sent_at desc);

-- Enable RLS
alter table public.notification_deliveries enable row level security;

-- RLS policies: family members can read delivery logs for their pacientes
create policy notification_deliveries_family_read on notification_deliveries for select
  using (
    exists (
      select 1 from public.tomas t
      where t.id = notification_deliveries.toma_id
        and is_active_family_member(t.paciente_id)
    )
  );

-- RLS policies: insert via Edge Function (service role bypasses RLS)
-- but authenticated users can insert for audit trail
create policy notification_deliveries_insert on notification_deliveries for insert
  with check (
    exists (
      select 1 from public.tomas t
      where t.id = notification_deliveries.toma_id
        and is_active_family_member(t.paciente_id)
    )
  );
