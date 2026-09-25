create table if not exists ad_requests (
  id uuid primary key default gen_random_uuid(),
  advertiser_name text not null,
  contact_email text not null,
  title text not null,
  description text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video', 'link')),
  media_url text,
  image_url text,
  target_url text not null,
  placement text not null default 'footer',
  start_date date,
  end_date date,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_requests_status_dates_idx on ad_requests(status, start_date, end_date);
alter table ad_requests enable row level security;
alter table ad_requests add column if not exists media_type text not null default 'image';
alter table ad_requests add column if not exists media_url text;
alter table ad_requests add column if not exists media_path text;
drop policy if exists "public can read approved adverts" on ad_requests;
create policy "public can read approved adverts" on ad_requests for select using (
  status = 'approved' and (start_date is null or start_date <= current_date) and (end_date is null or end_date >= current_date)
);