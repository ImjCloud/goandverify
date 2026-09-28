alter table public.campaign_events add column if not exists evidence_id uuid;
alter table public.campaign_events add column if not exists submission_id uuid;
do $$ begin
  alter table public.campaign_events add constraint campaign_events_evidence_id_fkey foreign key (evidence_id) references public.evidence(id) on delete cascade;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table public.campaign_events add constraint campaign_events_submission_id_fkey foreign key (submission_id) references public.submissions(id) on delete set null;
exception when duplicate_object then null;
end $$;
create index if not exists campaign_events_evidence_id_idx on public.campaign_events(evidence_id);
create index if not exists campaign_events_submission_id_idx on public.campaign_events(submission_id);
