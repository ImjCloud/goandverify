import {NextRequest, NextResponse} from 'next/server';
import {adminToken, ADMIN_COOKIE} from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
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
    return NextResponse.json({error: 'Incorrect password.'}, {status: 401});
  }

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
