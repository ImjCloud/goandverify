import {NextRequest, NextResponse} from 'next/server';
import {randomUUID} from 'crypto';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

function inferMediaKind(file: File | null): 'image' | 'video' | 'none' {
  if (!file) return 'none';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (file.type.startsWith('image/') || IMAGE_EXT.test(`.${ext}`)) return 'image';
  if (file.type.startsWith('video/') || VIDEO_EXT.test(`.${ext}`)) return 'video';
  return 'none';
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});
  const {data, error} = await supabaseAdmin().from('campaign_events').select('*').order('event_date', {ascending: false, nullsFirst: false}).order('created_at', {ascending: false});
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({events: data ?? []});
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});

  const form = await req.formData();
  const value = (key: string) => String(form.get(key) ?? '').trim();
  const title = value('title');
  const description = value('description') || null;
  const eventDate = value('eventDate') || null;
  const location = value('location') || null;
  const href = value('href') || null;
  const rawFile = form.get('mediaFile');
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  if (!title) return NextResponse.json({error: 'Campaign event title is required.'}, {status: 400});
  if (!file) return NextResponse.json({error: 'A campaign image or video is required. Whats New is populated only from campaign media uploads.'}, {status: 400});
  if (href) {
    try {
      const u = new URL(href);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
      return NextResponse.json({error: 'The link must be a valid http/https URL.'}, {status: 400});
    }
  }

  const mediaType = inferMediaKind(file);
  if (mediaType === 'none') return NextResponse.json({error: 'Upload a supported campaign image or video.'}, {status: 400});
  if (file.size > 30 * 1024 * 1024) return NextResponse.json({error: 'Upload an image or video file up to 30MB.'}, {status: 400});

  const admin = supabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads';
  const extension = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const mediaPath = `campaign-events/${randomUUID()}.${extension}`;
  const upload = await admin.storage.from(bucket).upload(mediaPath, new Uint8Array(await file.arrayBuffer()), {contentType: file.type || undefined});
  if (upload.error) return NextResponse.json({error: 'Could not upload the campaign media.'}, {status: 500});

  const mediaUrl = admin.storage.from(bucket).getPublicUrl(mediaPath).data.publicUrl;
  const {data, error} = await admin
    .from('campaign_events')
    .insert({title, description, event_date: eventDate, location, media_type: mediaType, media_url: mediaUrl, media_path: mediaPath, image_url: mediaType === 'image' ? mediaUrl : null, href})
    .select('id')
    .single();

  if (error) {
    await admin.storage.from(bucket).remove([mediaPath]);
    return NextResponse.json({error: error.message}, {status: 500});
  }

  await logAudit('campaign_event_created', 'campaign_event', data.id, {title, mediaType});
  return NextResponse.json({ok: true, id: data.id});
}
