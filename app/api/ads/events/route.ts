import {NextRequest, NextResponse} from 'next/server';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {checkRateLimit, getClientIp} from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) return NextResponse.json({ok: true});
  const rate = await checkRateLimit(`ad-event:${getClientIp(req)}`, 120, 3600);
  if (!rate.allowed) return NextResponse.json({error: 'Too many events.'}, {status: 429});
  const body = await req.json().catch(() => ({}));
  const adId = typeof body.adId === 'string' ? body.adId : '';
  const eventType = body.eventType === 'click' ? 'click' : body.eventType === 'impression' ? 'impression' : '';
  if (!adId || !eventType) return NextResponse.json({error: 'Invalid advert event.'}, {status: 400});
  const admin = supabaseAdmin();
  const {data: ad, error: adError} = await admin.from('ad_requests').select('id,status,paused_at,start_date,end_date').eq('id', adId).maybeSingle();
  if (adError) return NextResponse.json({error: 'Could not validate advert.'}, {status: 500});
  if (!ad || ad.status !== 'approved' || ad.paused_at) return NextResponse.json({error: 'Advert is not active.'}, {status: 404});
  const now = new Date();
  const start = ad.start_date ? new Date(`${ad.start_date}T00:00:00Z`) : null;
  const end = ad.end_date ? new Date(`${ad.end_date}T23:59:59Z`) : null;
  if ((start && now < start) || (end && now > end)) return NextResponse.json({error: 'Advert is outside its active date range.'}, {status: 404});
  const {error} = await admin.from('ad_events').insert({ad_id: adId, event_type: eventType});
  if (error) return NextResponse.json({error: 'Could not record advert event.'}, {status: 500});
  return NextResponse.json({ok: true});
}
