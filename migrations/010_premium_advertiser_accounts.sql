-- Premium advertiser accounts are authenticated through Supabase Auth.
-- Accounts stay pending until an admin explicitly approves them.
create table if not exists advertiser_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,
  advertiser_name text not null,
  contact_email text,
  contact_whatsapp text,
  plan text not null default 'premium' check (plan in ('premium')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  max_posts integer not null default 3 check (max_posts between 1 and 3),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists advertiser_accounts_status_idx on advertiser_accounts(status);
create index if not exists advertiser_accounts_auth_user_idx on advertiser_accounts(auth_user_id);
alter table advertiser_accounts enable row level security;

alter table ad_requests add column if not exists advertiser_account_id uuid references advertiser_accounts(id) on delete set null;
alter table ad_requests add column if not exists plan text not null default 'free';
alter table ad_requests drop constraint if exists ad_requests_plan_check;
alter table ad_requests add constraint ad_requests_plan_check check (plan in ('free','premium'));
create index if not exists ad_requests_account_idx on ad_requests(advertiser_account_id, created_at desc);
create index if not exists ad_requests_plan_created_idx on ad_requests(plan, created_at desc);

-- Premium advertiser media uses the existing public advert storage bucket.
-- All mutations remain server-side through the service role.
