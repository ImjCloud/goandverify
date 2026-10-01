-- Keep deleted premium advertiser accounts for audit history while blocking access.
alter table public.advertiser_accounts drop constraint if exists advertiser_accounts_status_check;
alter table public.advertiser_accounts add constraint advertiser_accounts_status_check check (status in ('pending','approved','rejected','suspended','deleted'));
create index if not exists advertiser_accounts_deleted_idx on public.advertiser_accounts(status, updated_at desc);
