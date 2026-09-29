import {randomUUID} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';

const IMAGE_MIMES: Record<string,string> = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',svg:'image/svg+xml'};
const VIDEO_MIMES: Record<string,string> = {mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/mp4'};

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});
  const form = await req.formData();
  const id = String(form.get('id') ?? '').trim();
  const mediaKind = String(form.get('mediaKind') ?? '').trim();
  const rawFile = form.get('file');
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
  if (!id || !file) return NextResponse.json({error: 'Advert and media file are required.'}, {status: 400});
  if (!['image','video'].includes(mediaKind)) return NextResponse.json({error: 'Media must be an image or video.'}, {status: 400});
  if (file.size > 30 * 1024 * 1024) return NextResponse.json({error: 'Upload an image or video file up to 30MB.'}, {status: 400});
  const extension = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const expectedMime = mediaKind === 'image' ? IMAGE_MIMES[extension] : VIDEO_MIMES[extension];
  if (!expectedMime) return NextResponse.json({error: mediaKind === 'image' ? 'Supported image formats: JPG, PNG, WebP, GIF, AVIF or SVG.' : 'Supported video formats: MP4, WebM, MOV or M4V.'}, {status: 400});
  if (file.type && file.type !== expectedMime && !(mediaKind === 'video' && file.type === 'video/quicktime' && expectedMime === 'video/quicktime')) return NextResponse.json({error: 'The uploaded file type does not match its extension.'}, {status: 400});
  const admin = supabaseAdmin();
  const {data: current, error: fetchError} = await admin.from('ad_requests').select('id,media_path').eq('id', id).single();
  if (fetchError || !current) return NextResponse.json({error: 'Advert not found.'}, {status: 404});
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads';
  const mediaPath = `adverts/${randomUUID()}.${extension}`;
  const upload = await admin.storage.from(bucket).upload(mediaPath, new Uint8Array(await file.arrayBuffer()), {contentType: expectedMime, cacheControl: '3600'});
  if (upload.error) return NextResponse.json({error: 'Could not upload the advert media.'}, {status: 500});
  const publicUrl = admin.storage.from(bucket).getPublicUrl(mediaPath).data.publicUrl;
  const patch = mediaKind === 'image'
    ? {media_type: 'image', media_url: publicUrl, image_url: publicUrl, media_path: mediaPath, updated_at: new Date().toISOString()}
    : {media_type: 'video', media_url: publicUrl, image_url: null, media_path: mediaPath, updated_at: new Date().toISOString()};
  const {data, error} = await admin.from('ad_requests').update(patch).eq('id', id).select('*').single();
  if (error) {
    await admin.storage.from(bucket).remove([mediaPath]).catch(() => {});
    return NextResponse.json({error: 'Could not update the advert media.'}, {status: 500});
  }
  if (current.media_path && current.media_path !== mediaPath) await admin.storage.from(bucket).remove([current.media_path]).catch(() => {});
  await logAudit('advert_media_updated', 'ad_request', id, {mediaKind, fileName: file.name});
  return NextResponse.json({ok: true, ad: data});
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});
  const admin = supabaseAdmin();
  const {data, error} = await admin.from('ad_requests').select('*').order('created_at', {ascending: false});
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  const {data: events, error: eventsError} = await admin.from('ad_events').select('ad_id,event_type');
  if (eventsError) return NextResponse.json({error: `Advert analytics are unavailable: ${eventsError.message}`}, {status: 500});
  const counts = new Map<string, {impressions: number; clicks: number}>();
  for (const event of events ?? []) { const count = counts.get(event.ad_id) ?? {impressions: 0, clicks: 0}; if (event.event_type === 'click') count.clicks += 1; else count.impressions += 1; counts.set(event.ad_id, count); }
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
    await logAudit(`advert_${body.action}`, 'ad_request', id, {}); return NextResponse.json({ok: true});
  }
  if (body.action === 'edit') {
    const {data: current, error: fetchError} = await admin.from('ad_requests').select('*').eq('id', id).single();
    if (fetchError || !current) return NextResponse.json({error: 'Advert not found.'}, {status: 404});
    const patch: Record<string, unknown> = {};
    for (const key of ['advertiser_name','contact_email','contact_whatsapp','title','description','media_type','media_url','image_url','target_url','placement','start_date','end_date']) if (body[key] !== undefined) patch[key] = body[key] === '' ? null : body[key];
    if (patch.title !== undefined && !String(patch.title).trim()) return NextResponse.json({error: 'Advert title is required.'}, {status: 400});
    if (patch.media_type !== undefined && !['image','video','link'].includes(String(patch.media_type))) return NextResponse.json({error: 'Invalid media type.'}, {status: 400});
    for (const [field,label] of [['target_url','Destination URL'],['media_url','Media URL'],['image_url','Image URL']] as const) if (patch[field]) { try { const u = new URL(String(patch[field])); if (!['http:','https:'].includes(u.protocol)) throw new Error(); } catch { return NextResponse.json({error: `${label} must be a valid http/https URL.`}, {status: 400}); } }
    const {data, error} = await admin.from('ad_requests').update({...patch, updated_at: new Date().toISOString()}).eq('id', id).select('*').single();
    if (error) return NextResponse.json({error: error.message}, {status: 500});
    await logAudit('advert_updated', 'ad_request', id, {fields: Object.keys(patch)}); return NextResponse.json({ok: true, ad: data});
  }
  const status = body.status === 'approved' ? 'approved' : body.status === 'rejected' ? 'rejected' : '';
  if (!status) return NextResponse.json({error: 'Invalid advert action.'}, {status: 400});
  const update = {status, reviewer_notes: typeof body.notes === 'string' ? body.notes : null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString()};
  const {data: ad, error} = await admin.from('ad_requests').update(update).eq('id', id).select('title,description,target_url').single();
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  if (status === 'approved' && ad) await admin.from('activity_events').insert({event_type: 'advert_published', title: ad.title, description: ad.description, href: ad.target_url});
  await logAudit(`advert_${status}`, 'ad_request', id, {status}); return NextResponse.json({ok: true});
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
  await logAudit('advert_cancelled', 'ad_request', id, {title: ad.title}); return NextResponse.json({ok: true});
}
