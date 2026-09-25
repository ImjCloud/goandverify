alter table ad_requests add column if not exists media_path text;
alter table ad_requests add column if not exists paused_at timestamptz;

create table if not exists ad_events (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references ad_requests(id) on delete cascade,
  event_type text not null check (event_type in ('impression','click')),
  visitor_key text,
  created_at timestamptz not null default now()
);
create index if not exists ad_events_ad_type_idx on ad_events(ad_id, event_type, created_at desc);
alter table ad_events enable row level security;

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('evidence_published','correction_resolved','advert_published')),
  title text not null,
  description text,
  href text,
  created_at timestamptz not null default now()
);
create index if not exists activity_events_created_idx on activity_events(created_at desc);
alter table activity_events enable row level security;
drop policy if exists "public can read activity events" on activity_events;
create policy "public can read activity events" on activity_events for select using (true);

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  target_type text not null check (target_type in ('person','issue','location')),
  target_value text not null,
  title text not null,
  body text not null,
  href text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notification_events_pending_idx on notification_events(sent_at, created_at);
alter table notification_events enable row level security;
