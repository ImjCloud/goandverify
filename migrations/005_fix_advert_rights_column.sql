-- Run in your Supabase SQL Editor. Fixes advert submissions failing with
-- "Could not save the advert request" — the /api/ads route has always
-- tried to write a rights_confirmed column that was never actually added
-- to the ad_requests table, so every single advert submission failed at
-- the database insert step.
alter table ad_requests add column if not exists rights_confirmed boolean not null default false;
