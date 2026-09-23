import type {NextRequest} from 'next/server';
import crypto from 'crypto';

export const ADMIN_COOKIE = 'admin_session';

/**
 * Deterministic session token derived from ADMIN_SESSION_SECRET. This is a
 * lightweight single-password gate for the moderation console, suitable for
 * a small trusted team. It is NOT a full multi-admin auth system — for that,
 * upgrade to Supabase Auth (email/password or magic link) + Row Level
 * Security policies keyed on auth.uid(), matching the policies already
 * sketched in lib/supabase.sql.
 */
function expectedToken(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update('admin-session').digest('hex');
}

export function adminToken(): string | null {
  return expectedToken();
}

export function isAdminRequest(req: NextRequest): boolean {
  const expected = expectedToken();
  if (!expected) return false;
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
