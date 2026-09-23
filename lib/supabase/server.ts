import {createClient} from '@supabase/supabase-js';

// True once the required Supabase env vars are present. Every caller in this
// project checks this first and falls back to the static demo data in
// lib/data.ts when it's false, so the site still works before Supabase is set up.
export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const supabasePublicConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Service-role client. SERVER ONLY — bypasses Row Level Security.
 * Never import this file into a Client Component, and never send
 * SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, {auth: {persistSession: false}});
}

/**
 * Anon client. Respects Row Level Security — safe for reading publicly
 * readable rows (e.g. published evidence) from Server Components/Route Handlers.
 */
export function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return createClient(url, key, {auth: {persistSession: false}});
}
