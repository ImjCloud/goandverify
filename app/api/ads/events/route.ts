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
  const {error} = await supabaseAdmin().from('ad_events').insert({ad_id: adId, event_type: eventType});
  if (error) return NextResponse.json({error: 'Could not record advert event.'}, {status: 500});
  return NextResponse.json({ok: true});
}
