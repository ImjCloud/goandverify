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
  const {data: events, error: eventsError} = await admin.from('ad_events').select('ad_id,event_type');
  if (eventsError) return NextResponse.json({error: `Advert analytics are unavailable: ${eventsError.message}`}, {status: 500});
  const counts = new Map<string, {impressions: number; clicks: number}>();
  for (const event of events ?? []) {
    const count = counts.get(event.ad_id) ?? {impressions: 0, clicks: 0};
    if (event.event_type === 'click') count.clicks += 1; else count.impressions += 1;
    counts.set(event.ad_id, count);
  }
  return NextResponse.json({ads: (data ?? []).map(ad => { const analytics = counts.get(ad.id) ?? {impressions: 0, clicks: 0}; return {...ad, analytics: {...analytics, ctr: analytics.impressions ? (analytics.clicks / analytics.impressions) * 100 : 0}}; })});
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({error: 'Advert id is required.'}, {status: 400});
  const admin = supabaseAdmin();

  if (body.action === 'pause' || body.action === 'resume') {
    const {error} = await admin.from('ad_requests').update({paused_at: body.action === 'pause' ? new Date().toISOString() : null, updated_at: new Date().toISOString()}).eq('id', id);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
    await logAudit(`advert_${body.action}`, 'ad_request', id, {});
    return NextResponse.json({ok: true});
  }

  if (body.action === 'edit') {
    const {data: current, error: fetchError} = await admin.from('ad_requests').select('*').eq('id', id).single();
    if (fetchError || !current) return NextResponse.json({error: 'Advert not found.'}, {status: 404});
    const patch: Record<string, unknown> = {};
    for (const key of ['advertiser_name','contact_email','contact_whatsapp','title','description','media_url','image_url','target_url','start_date','end_date']) {
      if (body[key] !== undefined) patch[key] = body[key] === '' ? null : body[key];
    }
    if (patch.title !== undefined && !String(patch.title).trim()) return NextResponse.json({error: 'Advert title is required.'}, {status: 400});
    if (patch.target_url !== undefined && patch.target_url) {
      try { const u = new URL(String(patch.target_url)); if (!['http:','https:'].includes(u.protocol)) throw new Error(); } catch { return NextResponse.json({error: 'Destination URL must be a valid http/https URL.'}, {status: 400}); }
    }
    if (patch.media_url !== undefined && patch.media_url) {
      try { const u = new URL(String(patch.media_url)); if (!['http:','https:'].includes(u.protocol)) throw new Error(); } catch { return NextResponse.json({error: 'Media URL must be a valid http/https URL.'}, {status: 400}); }
    }
    if (patch.image_url !== undefined && patch.image_url) {
      try { const u = new URL(String(patch.image_url)); if (!['http:','https:'].includes(u.protocol)) throw new Error(); } catch { return NextResponse.json({error: 'Image URL must be a valid http/https URL.'}, {status: 400}); }
    }
    const {data, error} = await admin.from('ad_requests').update({...patch, updated_at: new Date().toISOString()}).eq('id', id).select('*').single();
    if (error) return NextResponse.json({error: error.message}, {status: 500});
    await logAudit('advert_updated', 'ad_request', id, {fields: Object.keys(patch)});
    return NextResponse.json({ok: true, ad: data});
  }

  const status = body.status === 'approved' ? 'approved' : body.status === 'rejected' ? 'rejected' : '';
  if (!status) return NextResponse.json({error: 'Invalid advert action.'}, {status: 400});
  const update = {status, reviewer_notes: typeof body.notes === 'string' ? body.notes : null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString()};
  const {data: ad, error} = await admin.from('ad_requests').update(update).eq('id', id).select('title,description,target_url').single();
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  if (status === 'approved' && ad) await admin.from('activity_events').insert({event_type: 'advert_published', title: ad.title, description: ad.description, href: ad.target_url});
  await logAudit(`advert_${status}`, 'ad_request', id, {status});
  return NextResponse.json({ok: true});
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({error: 'Advert id is required.'}, {status: 400});
  const admin = supabaseAdmin();
  const {data: ad, error: fetchError} = await admin.from('ad_requests').select('id,title,media_path').eq('id', id).single();
  if (fetchError || !ad) return NextResponse.json({error: 'Advert not found.'}, {status: 404});
  const {error: deleteError} = await admin.from('ad_requests').delete().eq('id', id);
  if (deleteError) return NextResponse.json({error: deleteError.message}, {status: 500});
  if (ad.media_path) await admin.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads').remove([ad.media_path]);
  await logAudit('advert_cancelled', 'ad_request', id, {title: ad.title});
  return NextResponse.json({ok: true});
}
