-- Run this in the Supabase SQL Editor. Lock down internal tables so only the
-- server-side service-role key can access them.
create extension if not exists pgcrypto;

-- Both tables have zero policies, denying access to anon and authenticated
-- roles while leaving service-role access untouched.
create table if not exists audit_logs (
	id uuid primary key default gen_random_uuid(),
	actor_id uuid,
	action text not null,
	entity_type text not null,
	entity_id uuid,
	details jsonb,
	created_at timestamptz not null default now()
);

create table if not exists rate_limits (
	key text primary key,
	window_start timestamptz not null default now(),
	count int not null default 0
);
alter table audit_logs enable row level security;
alter table rate_limits enable row level security;

create table if not exists flags (
	id uuid primary key default gen_random_uuid(),
	evidence_id uuid references evidence(id) on delete cascade,
	reason text not null,
	details text,
	reporter_email text,
	status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
	resolved_by uuid,
	resolved_at timestamptz,
	resolution_notes text,
	created_at timestamptz not null default now()
);
alter table flags enable row level security;

-- flags: remove the public-insert policy. It was unused by the app (the
-- /api/flags route already writes via the service-role key, which bypasses
-- RLS), so it only existed as an unnecessary way to bypass that route's
-- rate limiting by posting directly to Supabase's REST API.
drop policy if exists "public can create flags" on flags;
