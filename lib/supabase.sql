-- Production database blueprint for Supabase/Postgres.
create extension if not exists pgcrypto;

do $$ begin
  create type evidence_type as enum ('image','video','audio','document','statement','interview','event','news');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type verification_status as enum ('submitted','under_review','source_verified','partially_verified','disputed','archived');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type submission_status as enum ('pending_review','under_review','approved','rejected','needs_more_information');
exception when duplicate_object then null;
end $$;

create table if not exists political_parties (
 id uuid primary key default gen_random_uuid(), name text not null, short_name text not null,
 logo_url text, website_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists people (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
 biography text, portrait_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists political_affiliations (
 id uuid primary key default gen_random_uuid(), person_id uuid not null references people(id) on delete cascade,
 party_id uuid not null references political_parties(id), role text, start_date date, end_date date,
 source_url text, verified_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists evidence (
 id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
 type evidence_type not null, description text not null, event_date date, publication_date date,
 location_city text, location_state text, location_country text, author text, source_name text,
 source_url text, media_url text, thumbnail_url text, verification_status verification_status not null default 'submitted',
 event_category text check (event_category in ('campaign_activity','historical_event')),
 about_person text check (about_person in ('peter-obi','rabiu-kwankwaso','both')),
 uploader_name text, uploader_email text, rights text, verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists evidence_people (evidence_id uuid references evidence(id) on delete cascade, person_id uuid references people(id) on delete cascade, primary key(evidence_id, person_id));
create table if not exists tags (id uuid primary key default gen_random_uuid(), name text unique not null);
create table if not exists evidence_tags (evidence_id uuid references evidence(id) on delete cascade, tag_id uuid references tags(id) on delete cascade, primary key(evidence_id, tag_id));

create table if not exists submissions (
 id uuid primary key default gen_random_uuid(), evidence_id uuid references evidence(id) on delete set null,
 title text not null, description text not null, location text not null, event_date date,
 source_url text, uploader_name text, uploader_email text, media_path text, consent boolean not null default false,
 event_category text check (event_category in ('campaign_activity','historical_event')),
 about_person text check (about_person in ('peter-obi','rabiu-kwankwaso','both')),
 status submission_status not null default 'pending_review', reviewer_notes text, reviewed_by uuid, reviewed_at timestamptz,
 created_at timestamptz not null default now()
);

create table if not exists audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null, entity_type text not null,
 entity_id uuid, details jsonb, created_at timestamptz not null default now()
);
-- RLS with zero policies = deny all to anon/authenticated. Written only via
-- the service-role key (lib/auditLog.ts), which bypasses RLS regardless.
alter table audit_logs enable row level security;

alter table evidence enable row level security;
alter table submissions enable row level security;
alter table people enable row level security;
alter table political_parties enable row level security;

-- Public visitors can read published evidence/people/party records.
-- Every row in `evidence` got there via a moderator's explicit Approve action
-- in /admin (unapproved items live only in `submissions`, which the public
-- can never read), so membership in this table IS the publish gate.
-- verification_status is a trust-level badge shown on the record, not a
-- second visibility gate — filtering reads by it here caused approved items
-- to silently stay invisible whenever the moderator left the badge on its
-- default value. If you ever add a true "draft" evidence state, reintroduce
-- a status filter here scoped to that state specifically.
drop policy if exists "public can read evidence" on evidence;
create policy "public can read evidence" on evidence for select using (true);
drop policy if exists "public can read people" on people;
create policy "public can read people" on people for select using (true);
drop policy if exists "public can read parties" on political_parties;
create policy "public can read parties" on political_parties for select using (true);

-- Public submissions should be inserted only through a controlled server-side endpoint or tightly scoped policy.

do $$ begin
  create type giving_category as enum ('Health','Education','Relief','Community','Other');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type giving_verification_status as enum ('source_identified','source_verified','partially_verified','disputed','under_review');
exception when duplicate_object then null;
end $$;

create table if not exists giving_records (
 id uuid primary key default gen_random_uuid(), slug text unique not null, person_id uuid references people(id) on delete set null,
 contribution_date date not null, recipient text not null, amount numeric(20,2), currency text not null default 'NGN',
 amount_display text, category giving_category not null default 'Other', location text, description text not null,
 source_name text not null, source_url text, archive_source_url text, verification_status giving_verification_status not null default 'source_identified',
 verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists giving_records_date_idx on giving_records(contribution_date desc);
create index if not exists giving_records_category_idx on giving_records(category);
create index if not exists giving_records_person_idx on giving_records(person_id);
alter table giving_records enable row level security;
drop policy if exists "public can read giving records" on giving_records;
create policy "public can read giving records" on giving_records for select using (verification_status in ('source_identified','source_verified','partially_verified','disputed'));

-- ---------------------------------------------------------------------------
-- Storage bucket for evidence-submission uploads.
-- Run this once your project exists (Supabase SQL editor, or via the
-- dashboard: Storage -> New bucket -> name it evidence-uploads, public).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('evidence-uploads', 'evidence-uploads', true)
on conflict (id) do nothing;

-- The app's server-side routes (app/api/submissions, app/api/admin/**) use the
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses these policies entirely — so the
-- policies below only matter if you ever let the browser talk to Storage
-- directly with the anon key. Public read lets approved evidence images/video
-- render on the site without a signed URL.
drop policy if exists "public can read evidence-uploads" on storage.objects;
create policy "public can read evidence-uploads" on storage.objects
  for select using (bucket_id = 'evidence-uploads');

-- ---------------------------------------------------------------------------
-- Link-based evidence submissions (paste a URL instead of uploading a file).
-- media_url holds the external link itself; thumbnail_url holds the
-- auto-detected preview image (YouTube/Vimeo thumbnail, the image itself if
-- it IS an image, or an Open Graph image scraped from the page).
-- ---------------------------------------------------------------------------
alter table submissions add column if not exists media_url text;
alter table submissions add column if not exists thumbnail_url text;
alter table submissions add column if not exists media_title text;

-- ---------------------------------------------------------------------------
-- Flags / corrections: public "something's wrong with this record" reports,
-- reviewed by moderators. Separate from submissions (new evidence) — this is
-- for disputing or correcting evidence that's already published.
-- ---------------------------------------------------------------------------
do $$ begin
  create type flag_status as enum ('open','resolved','dismissed');
exception when duplicate_object then null;
end $$;
create table if not exists flags (
 id uuid primary key default gen_random_uuid(), evidence_id uuid references evidence(id) on delete cascade,
 reason text not null, details text, reporter_email text,
 status flag_status not null default 'open', resolved_by uuid, resolved_at timestamptz, resolution_notes text,
 created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- DB-backed rate limiting. A fixed-window counter keyed by e.g. "submit:1.2.3.4".
-- DB-backed (not in-memory) because serverless functions don't share memory
-- across instances, so an in-memory counter would silently do nothing in
-- production on Vercel/similar.
-- ---------------------------------------------------------------------------
create table if not exists rate_limits (
 key text primary key, window_start timestamptz not null default now(), count int not null default 0
);
-- RLS with zero policies = deny all to anon/authenticated. Read/written only
-- via the service-role key (lib/rateLimit.ts) — without this, the public
-- anon key could delete its own row to bypass rate limiting entirely.
alter table rate_limits enable row level security;

create or replace function consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns table(allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare current_count integer;
begin
  insert into rate_limits(key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when rate_limits.window_start + make_interval(secs => p_window_seconds) <= now() then now() else rate_limits.window_start end,
    count = case when rate_limits.window_start + make_interval(secs => p_window_seconds) <= now() then 1 else rate_limits.count + 1 end
  returning rate_limits.count into current_count;
  return query select current_count <= p_limit, greatest(p_limit - current_count, 0);
end;
$$;
revoke all on function consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function consume_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Wayback Machine snapshot, captured automatically when evidence is approved,
-- so a cited fact doesn't die when the original source page does.
-- ---------------------------------------------------------------------------
alter table evidence add column if not exists wayback_url text;

-- ---------------------------------------------------------------------------
-- Full-text search: a generated tsvector over title/description/source/location,
-- with a GIN index, plus a ranked search function callable via supabase-js .rpc().
-- ---------------------------------------------------------------------------
alter table evidence add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(source_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(location_city, '') || ' ' || coalesce(location_state, '') || ' ' || coalesce(location_country, '')), 'C')
  ) stored;
create index if not exists evidence_search_idx on evidence using gin(search_vector);

create or replace function search_evidence(query text)
returns setof evidence
language sql stable
as $$
  select * from evidence
  where search_vector @@ websearch_to_tsquery('english', query)
  order by ts_rank(search_vector, websearch_to_tsquery('english', query)) desc
  limit 50;
$$;

-- Public can create flags (a moderator reviews before anything changes); admin
-- routes use the service-role key so they bypass RLS regardless.
-- RLS with zero policies = deny all to anon/authenticated. Written only via
-- /api/flags, which uses the service-role key (bypasses RLS) and applies
-- rate limiting — a public insert policy here would let that be bypassed
-- by posting directly to Supabase's REST API with the public anon key.
alter table flags enable row level security;

-- Follow requests for election-cycle updates. Keep this table private; the
-- application notification worker reads it with the service-role key.
create table if not exists follow_subscriptions (
 id uuid primary key default gen_random_uuid(), email text not null,
 target_type text not null check (target_type in ('person','issue','location')),
 target_value text not null, election_cycle text not null default '2027',
 status text not null default 'active' check (status in ('active','unsubscribed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists follow_subscriptions_unique_idx
  on follow_subscriptions (lower(email), target_type, lower(target_value), election_cycle);
create index if not exists follow_subscriptions_target_idx
  on follow_subscriptions (target_type, target_value, election_cycle);
alter table follow_subscriptions enable row level security;

-- Advertising requests remain private until a moderator approves them.
create table if not exists ad_requests (
 id uuid primary key default gen_random_uuid(),
 advertiser_name text not null, contact_email text, contact_whatsapp text,
 title text not null, description text not null, media_type text not null default 'image' check (media_type in ('image','video','link')), media_url text, media_path text, image_url text,
 target_url text not null, placement text not null default 'footer',
 start_date date, end_date date,
 status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
 paused_at timestamptz,
 reviewer_notes text, reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table ad_requests add column if not exists media_type text not null default 'image';
alter table ad_requests add column if not exists media_url text;
alter table ad_requests add column if not exists media_path text;
alter table ad_requests add column if not exists paused_at timestamptz;
alter table ad_requests add column if not exists contact_whatsapp text;
alter table ad_requests add column if not exists rights_confirmed boolean not null default false;
alter table ad_requests alter column contact_email drop not null;
alter table ad_requests drop constraint if exists ad_requests_contact_required;
alter table ad_requests add constraint ad_requests_contact_required
  check (coalesce(contact_email, '') <> '' or coalesce(contact_whatsapp, '') <> '');
create index if not exists ad_requests_status_dates_idx on ad_requests(status, start_date, end_date);
alter table ad_requests enable row level security;
drop policy if exists "public can read approved adverts" on ad_requests;
create policy "public can read approved adverts" on ad_requests for select using (
 status = 'approved' and (start_date is null or start_date <= current_date) and (end_date is null or end_date >= current_date)
);

-- Campaign events shown on the homepage "What's Next" section.
create table if not exists campaign_events (
 id uuid primary key default gen_random_uuid(),
 title text not null, description text,
 event_date date, location text,
 media_type text not null default 'image' check (media_type in ('image','video','none')),
 media_url text, media_path text, image_url text, href text,
 created_at timestamptz not null default now()
);
alter table campaign_events enable row level security;
drop policy if exists "public read campaign_events" on campaign_events;
create policy "public read campaign_events" on campaign_events for select using (true);
create index if not exists campaign_events_created_at_idx on campaign_events(created_at desc);
