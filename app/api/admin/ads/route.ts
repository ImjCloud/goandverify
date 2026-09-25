import {NextRequest, NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});
  const admin = supabaseAdmin();
  const {data, error} = await admin.from('ad_requests').select('*').order('created_at', {ascending: false});
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  const {data: events} = await admin.from('ad_events').select('ad_id,event_type');
  const counts = new Map<string, {impressions: number; clicks: number}>();
  for (const event of events ?? []) {
    const count = counts.get(event.ad_id) ?? {impressions: 0, clicks: 0};
    if (event.event_type === 'click') count.clicks += 1; else count.impressions += 1;
    counts.set(event.ad_id, count);
  }
  return NextResponse.json({ads: (data ?? []).map(ad => ({...ad, analytics: counts.get(ad.id) ?? {impressions: 0, clicks: 0}}))});
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const status = body.status === 'approved' ? 'approved' : body.status === 'rejected' ? 'rejected' : '';
  const pause = body.action === 'pause' || body.action === 'resume';
  if (!id || (!status && !pause)) return NextResponse.json({error: 'Invalid advert action.'}, {status: 400});

  const admin = supabaseAdmin();
  const update = pause ? {paused_at: body.action === 'pause' ? new Date().toISOString() : null, updated_at: new Date().toISOString()} : {status, reviewer_notes: typeof body.notes === 'string' ? body.notes : null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString()};
  const {data: ad, error} = await admin.from('ad_requests').update(update).eq('id', id).select('title,description,target_url').single();
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  if (status === 'approved' && ad) await admin.from('activity_events').insert({event_type: 'advert_published', title: ad.title, description: ad.description, href: ad.target_url});
  await logAudit(`advert_${pause ? body.action : status}`, 'ad_request', id, {status, action: body.action});
  return NextResponse.json({ok: true});
}
