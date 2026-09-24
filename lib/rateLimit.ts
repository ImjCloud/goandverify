import {supabaseConfigured, supabaseAdmin} from './supabase/server';

/**
 * Fixed-window rate limiter backed by the `rate_limits` table, so it works
 * correctly across serverless instances (an in-memory counter would not).
 * Fails OPEN if Supabase isn't configured or the check itself errors — a
 * missing rate limit table should never be the reason a real submission
 * fails, it should just mean rate limiting isn't active yet.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{allowed: boolean; remaining: number}> {
  if (!supabaseConfigured) return {allowed: true, remaining: limit};
  try {
    const admin = supabaseAdmin();
    const now = new Date();
    const {data: existing} = await admin.from('rate_limits').select('*').eq('key', key).maybeSingle();

    if (!existing) {
      await admin.from('rate_limits').insert({key, window_start: now.toISOString(), count: 1});
      return {allowed: true, remaining: limit - 1};
    }

    const windowStart = new Date(existing.window_start);
    const elapsedSeconds = (now.getTime() - windowStart.getTime()) / 1000;

    if (elapsedSeconds > windowSeconds) {
      // window expired, reset
      await admin.from('rate_limits').update({window_start: now.toISOString(), count: 1}).eq('key', key);
      return {allowed: true, remaining: limit - 1};
    }

    if (existing.count >= limit) {
      return {allowed: false, remaining: 0};
    }

    await admin.from('rate_limits').update({count: existing.count + 1}).eq('key', key);
    return {allowed: true, remaining: limit - existing.count - 1};
  } catch {
    return {allowed: true, remaining: limit};
  }
}

/** Best-effort client IP extraction from standard proxy headers. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
