-- Run this in your Supabase project's SQL Editor if you already set up the
-- database before this fix. It corrects the bug where approving a submission
-- from /admin created an evidence row that stayed invisible on the public
-- site unless the verification dropdown was manually changed away from its
-- default value.
drop policy if exists "public can read evidence" on evidence;
create policy "public can read evidence" on evidence for select using (true);

-- Also fix any evidence rows that already got silently "stuck" invisible
-- from a past approval — this makes anything already in the table visible.
-- (Harmless no-op if nothing is stuck.)
-- No data change needed: the policy fix above alone makes existing rows visible.
