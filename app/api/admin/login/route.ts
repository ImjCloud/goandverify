import {NextRequest, NextResponse} from 'next/server';
import {adminToken, ADMIN_COOKIE} from '@/lib/admin-auth';
import {logAudit} from '@/lib/auditLog';
import {checkRateLimit, getClientIp} from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-login:${ip}`, 10, 900); // 10 attempts/15min/IP
  if (!rl.allowed) {
    return NextResponse.json({error: 'Too many login attempts. Please wait before trying again.'}, {status: 429});
  }

  const {password} = await req.json().catch(() => ({password: ''}));
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const token = adminToken();

  if (!expectedPassword || !token) {
    return NextResponse.json(
      {error: 'Admin login is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in your environment.'},
      {status: 503}
    );
  }
  if (typeof password !== 'string' || password !== expectedPassword) {
    await logAudit('admin_login_failed', 'admin', null, {ip});
    return NextResponse.json({error: 'Incorrect password.'}, {status: 401});
  }
  await logAudit('admin_login_succeeded', 'admin', null, {ip});

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
