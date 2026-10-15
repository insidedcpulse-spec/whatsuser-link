create table if not exists public.crm_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  currency text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_subscriptions_email_idx on public.crm_subscriptions (lower(email));
create index if not exists crm_subscriptions_customer_idx on public.crm_subscriptions (stripe_customer_id);

-- Server-only table: service role bypasses RLS; no policies = no public access.
alter table public.crm_subscriptions enable row level security;
