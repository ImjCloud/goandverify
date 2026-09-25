-- Run this in your Supabase SQL Editor. Fixes a real gap: audit_logs and
-- rate_limits were created without Row Level Security enabled, which in
-- Supabase means the public anon key has full read/write access by default.
-- Both tables are meant to be touched ONLY by the server via the
-- service-role key (which bypasses RLS regardless), so the fix is to turn
-- RLS on with zero policies defined — that denies all access to the anon
-- and authenticated roles while leaving service-role access untouched.

alter table audit_logs enable row level security;
alter table rate_limits enable row level security;

-- flags: remove the public-insert policy. It was unused by the app (the
-- /api/flags route already writes via the service-role key, which bypasses
-- RLS), so it only existed as an unnecessary way to bypass that route's
-- rate limiting by posting directly to Supabase's REST API.
drop policy if exists "public can create flags" on flags;
