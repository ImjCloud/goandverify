import type {NextRequest} from 'next/server';
import crypto from 'crypto';

export const ADMIN_COOKIE = 'admin_session';
export type AdminRole = 'admin' | 'superadmin';

/**
 * Deterministic session token derived from ADMIN_SESSION_SECRET. This is a
 * lightweight single-password gate for the moderation console, suitable for
 * a small trusted team. It is NOT a full multi-admin auth system — for that,
 * upgrade to Supabase Auth (email/password or magic link) + Row Level
 * Security policies keyed on auth.uid(), matching the policies already
 * sketched in lib/supabase.sql.
 */
function expectedToken(role: AdminRole): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(`admin-session:${role}`).digest('hex');
}

export function adminToken(role: AdminRole): string | null {
  const token = expectedToken(role);
  return token ? `${role}.${token}` : null;
}

export function getAdminRole(req: NextRequest): AdminRole | null {
  const value = req.cookies.get(ADMIN_COOKIE)?.value ?? '';
  const separator = value.indexOf('.');
  const role = value.slice(0, separator) as AdminRole;
  const signature = value.slice(separator + 1);
  if ((role !== 'admin' && role !== 'superadmin') || !signature) return null;
  const expected = expectedToken(role);
  if (!expected) return null;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return role;
}

export function isAdminRequest(req: NextRequest, requiredRole: AdminRole = 'admin'): boolean {
  const role = getAdminRole(req);
  return role === 'superadmin' || (role === 'admin' && requiredRole === 'admin');
}
