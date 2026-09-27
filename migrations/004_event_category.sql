-- Run in your Supabase SQL Editor. Adds a way for submitters to say whether
-- something is current campaign activity or a historical record, and (for
-- historical items especially) who it's about.

alter table submissions add column if not exists event_category text check (event_category in ('campaign_activity','historical_event'));
alter table submissions add column if not exists about_person text check (about_person in ('peter-obi','rabiu-kwankwaso','both'));

alter table evidence add column if not exists event_category text check (event_category in ('campaign_activity','historical_event'));
alter table evidence add column if not exists about_person text check (about_person in ('peter-obi','rabiu-kwankwaso','both'));
