-- Campaign events are submitted by the public and published only after moderator approval.
alter table public.campaign_events add column if not exists status text not null default 'pending' check (status in ('pending','approved','rejected','archived'));
alter table public.campaign_events add column if not exists submitter_name text;
alter table public.campaign_events add column if not exists submitter_email text;
alter table public.campaign_events add column if not exists reviewed_at timestamptz;
alter table public.campaign_events add column if not exists reviewed_by text;

-- Preserve campaign events that were already intentionally published before moderation was introduced.
update public.campaign_events set status = 'approved' where status = 'pending';

drop policy if exists "public read campaign_events" on public.campaign_events;
drop policy if exists "public read approved campaign_events" on public.campaign_events;
create policy "public read approved campaign_events" on public.campaign_events
  for select using (status = 'approved');

create index if not exists campaign_events_status_idx
  on public.campaign_events(status, event_date desc, created_at desc);
