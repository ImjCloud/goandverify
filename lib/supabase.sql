-- Production database blueprint for Supabase/Postgres.
create extension if not exists pgcrypto;

create type evidence_type as enum ('image','video','audio','document','statement','interview','event','news');
create type verification_status as enum ('submitted','under_review','source_verified','partially_verified','disputed','archived');
create type submission_status as enum ('pending_review','under_review','approved','rejected','needs_more_information');

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
 uploader_name text, uploader_email text, rights text, verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists evidence_people (evidence_id uuid references evidence(id) on delete cascade, person_id uuid references people(id) on delete cascade, primary key(evidence_id, person_id));
create table if not exists tags (id uuid primary key default gen_random_uuid(), name text unique not null);
create table if not exists evidence_tags (evidence_id uuid references evidence(id) on delete cascade, tag_id uuid references tags(id) on delete cascade, primary key(evidence_id, tag_id));

create table if not exists submissions (
 id uuid primary key default gen_random_uuid(), evidence_id uuid references evidence(id) on delete set null,
 title text not null, description text not null, location text not null, event_date date,
 source_url text, uploader_name text, uploader_email text, media_path text, consent boolean not null default false,
 status submission_status not null default 'pending_review', reviewer_notes text, reviewed_by uuid, reviewed_at timestamptz,
 created_at timestamptz not null default now()
);

create table if not exists audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null, entity_type text not null,
 entity_id uuid, details jsonb, created_at timestamptz not null default now()
);

-- Enable RLS in production and create policies based on authenticated roles.
alter table evidence enable row level security;
alter table submissions enable row level security;
alter table people enable row level security;
alter table political_parties enable row level security;

-- Public visitors can read published evidence/people/party records.
create policy "public can read evidence" on evidence for select using (verification_status in ('source_verified','partially_verified','disputed','archived'));
create policy "public can read people" on people for select using (true);
create policy "public can read parties" on political_parties for select using (true);

-- Public submissions should be inserted only through a controlled server-side endpoint or tightly scoped policy.

create type giving_category as enum ('Health','Education','Relief','Community','Other');
create type giving_verification_status as enum ('source_identified','source_verified','partially_verified','disputed','under_review');

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
