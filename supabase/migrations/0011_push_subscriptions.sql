-- Migration 0011: push_subscriptions table
--
-- Stores Web Push subscription objects per user per device.
-- RLS: user reads/updates own rows; cuidador_principal reads family rows for diagnostics.
--
-- Columns:
--   id          — UUID primary key
--   user_id     — FK to auth.users (the subscriber)
--   endpoint    — Push service endpoint URL (unique)
--   p256dh      — P-256 DH public key from PushSubscription
--   auth        — Auth secret from PushSubscription
--   device_name — Short label parsed from navigator.userAgent
--   is_active   — Whether this subscription is still valid (default true)
--   created_at  — When the subscription was created
--   last_seen_at — Last time a push was successfully delivered

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index push_subscriptions_user_id_idx on push_subscriptions(user_id);
create index push_subscriptions_user_active_idx on push_subscriptions(user_id) where is_active;

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- RLS policies: owner reads/updates own rows
create policy push_subscriptions_owner_read on push_subscriptions for select
  using (user_id = auth.uid());

create policy push_subscriptions_owner_insert on push_subscriptions for insert
  with check (user_id = auth.uid());

create policy push_subscriptions_owner_update on push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS policies: cuidador_principal can read family members' subscriptions for diagnostics
create policy push_subscriptions_family_read on push_subscriptions for select
  using (
    exists (
      select 1 from family_members fm1
      join family_members fm2 on fm1.paciente_id = fm2.paciente_id
      where fm1.user_id = auth.uid()
        and fm1.role = 'cuidador_principal'
        and fm1.status = 'active'
        and fm2.user_id = push_subscriptions.user_id
        and fm2.status = 'active'
    )
  );
