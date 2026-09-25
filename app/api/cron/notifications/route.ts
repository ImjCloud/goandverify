import {NextRequest, NextResponse} from 'next/server';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured || !process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM_EMAIL) return NextResponse.json({error: 'Notification delivery is not configured.'}, {status: 503});

  const admin = supabaseAdmin();
  const {data: events, error: eventError} = await admin.from('notification_events').select('*').is('sent_at', null).order('created_at', {ascending: true}).limit(20);
  if (eventError) return NextResponse.json({error: 'Could not load notification events.'}, {status: 500});
  let delivered = 0;

  for (const event of events ?? []) {
    const {data: subscriptions} = await admin.from('follow_subscriptions').select('id,email').eq('status', 'active').eq('target_type', event.target_type).ilike('target_value', event.target_value);
    for (const subscription of subscriptions ?? []) {
      const response = await fetch('https://api.resend.com/emails', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}`}, body: JSON.stringify({from: process.env.NOTIFICATION_FROM_EMAIL, to: [subscription.email], subject: event.title, html: `<p>${event.body}</p>${event.href ? `<p><a href="${event.href}">View the update</a></p>` : ''}<p><small>You are receiving this because you followed ${event.target_value} on Public Record.</small></p>`})});
      if (response.ok) delivered += 1;
    }
    await admin.from('notification_events').update({sent_at: new Date().toISOString()}).eq('id', event.id);
  }
  return NextResponse.json({ok: true, events: events?.length ?? 0, delivered});
}
