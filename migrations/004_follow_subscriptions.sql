create table if not exists follow_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  target_type text not null check (target_type in ('person', 'issue', 'location')),
  target_value text not null,
  election_cycle text not null default '2027',
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists follow_subscriptions_unique_idx
  on follow_subscriptions (lower(email), target_type, lower(target_value), election_cycle);

create index if not exists follow_subscriptions_target_idx
  on follow_subscriptions (target_type, target_value, election_cycle);

alter table follow_subscriptions enable row level security;
