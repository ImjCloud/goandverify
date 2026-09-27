-- Already applied directly to the live database. Kept here so the schema
-- history in this repo matches what's actually running, and so a fresh
-- environment can be set up from these files alone.
create table if not exists campaign_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date,
  location text,
  media_type text not null default 'image' check (media_type in ('image','video','none')),
  media_url text,
  media_path text,
  image_url text,
  href text,
  created_at timestamptz not null default now()
);
alter table campaign_events enable row level security;
drop policy if exists "public read campaign_events" on campaign_events;
create policy "public read campaign_events" on campaign_events for select using (true);
create index if not exists campaign_events_created_at_idx on campaign_events(created_at desc);
