-- Run this in the Supabase SQL Editor.
-- Adds a WhatsApp contact number to advert requests and makes contact_email
-- optional (a request must still supply at least one way to reach the
-- advertiser: email or WhatsApp).

alter table ad_requests add column if not exists contact_whatsapp text;
alter table ad_requests alter column contact_email drop not null;

alter table ad_requests drop constraint if exists ad_requests_contact_required;
alter table ad_requests add constraint ad_requests_contact_required
  check (coalesce(contact_email, '') <> '' or coalesce(contact_whatsapp, '') <> '');
