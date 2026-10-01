-- Global emergency control for public advertising.
create table if not exists public.ad_system_settings (
  id boolean primary key default true check (id = true),
  ads_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.ad_system_settings (id, ads_enabled) values (true, true) on conflict (id) do nothing;
alter table public.ad_system_settings enable row level security;
revoke all on public.ad_system_settings from anon, authenticated;
grant select on public.ad_system_settings to anon;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ad_system_settings' and policyname='public can read ad system state') then
    create policy "public can read ad system state" on public.ad_system_settings for select to anon using (true);
  end if;
end $$;
