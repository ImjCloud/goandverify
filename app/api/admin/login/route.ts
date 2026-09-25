import {NextRequest, NextResponse} from 'next/server';
import {adminToken, ADMIN_COOKIE, type AdminRole} from '@/lib/admin-auth';
import {logAudit} from '@/lib/auditLog';
import {checkRateLimit, getClientIp} from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-login:${ip}`, 10, 900); // 10 attempts/15min/IP
  if (!rl.allowed) {
    return NextResponse.json({error: 'Too many login attempts. Please wait before trying again.'}, {status: 429});
  }

  const {password} = await req.json().catch(() => ({password: ''}));
  const adminPassword = process.env.ADMIN_PASSWORD;
  const superadminPassword = process.env.SUPERADMIN_PASSWORD;
  const role: AdminRole | null = typeof password === 'string' && superadminPassword && password === superadminPassword ? 'superadmin' : typeof password === 'string' && adminPassword && password === adminPassword ? 'admin' : null;
  const token = role ? adminToken(role) : null;

  if ((!adminPassword && !superadminPassword) || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      {error: 'Admin login is not configured. Set ADMIN_PASSWORD, optional SUPERADMIN_PASSWORD, and ADMIN_SESSION_SECRET.'},
      {status: 503}
    );
  }
  if (!role || !token) {
    await logAudit('admin_login_failed', 'admin', null, {ip});
    return NextResponse.json({error: 'Incorrect password.'}, {status: 401});
  }
  await logAudit('admin_login_succeeded', role, null, {ip});

  const res = NextResponse.json({ok: true});
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
