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
    const {data, error} = await admin.rpc('consume_rate_limit', {p_key: key, p_limit: limit, p_window_seconds: windowSeconds}).maybeSingle();
    const result = data as {allowed?: boolean; remaining?: number} | null;
    if (error || !result) return process.env.NODE_ENV === 'production' ? {allowed: false, remaining: 0} : {allowed: true, remaining: limit};
    return {allowed: result.allowed === true, remaining: Number(result.remaining) || 0};
  } catch {
    return process.env.NODE_ENV === 'production' ? {allowed: false, remaining: 0} : {allowed: true, remaining: limit};
  }
}

/** Best-effort client IP extraction from standard proxy headers. */
export function getClientIp(req: Request): string {
  return req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
}
