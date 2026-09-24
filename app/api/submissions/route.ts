import {NextRequest, NextResponse} from 'next/server';
import {randomUUID} from 'crypto';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {checkRateLimit, getClientIp} from '@/lib/rateLimit';
import {verifyTurnstile} from '@/lib/turnstile';
import {logAudit} from '@/lib/auditLog';

export const runtime = 'nodejs';

const ALLOWED_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf'];
const ALLOWED_EXACT = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json(
      {error: 'Evidence submission is not configured yet. Set the Supabase environment variables (see .env.example).'},
      {status: 503}
    );
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`submit:${ip}`, 5, 3600); // 5 submissions/hour/IP
  if (!rl.allowed) {
    return NextResponse.json({error: 'Too many submissions from this network. Please try again in an hour.'}, {status: 429});
  }

  try {
    const form = await req.formData();
    const turnstileToken = form.get('cf-turnstile-response') ? String(form.get('cf-turnstile-response')) : null;
    const captchaOk = await verifyTurnstile(turnstileToken, ip);
    if (!captchaOk) {
      return NextResponse.json({error: 'Captcha verification failed. Please try again.'}, {status: 400});
    }

    const title = String(form.get('title') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const location = String(form.get('location') ?? '').trim();
    const eventDate = form.get('eventDate') ? String(form.get('eventDate')) : null;
    const sourceUrl = form.get('sourceUrl') ? String(form.get('sourceUrl')) : null;
    const uploaderName = form.get('uploaderName') ? String(form.get('uploaderName')) : null;
    const consent = form.get('consent') === 'true';
    const file = form.get('file') as File | null;
    const mediaUrl = form.get('mediaUrl') ? String(form.get('mediaUrl')).trim() : null;
    const thumbnailUrl = form.get('thumbnailUrl') ? String(form.get('thumbnailUrl')) : null;
    const mediaTitle = form.get('mediaTitle') ? String(form.get('mediaTitle')) : null;

    if (!title || !description || !location || !consent || (!file && !mediaUrl)) {
      return NextResponse.json(
        {error: 'Please complete all required fields, including a file or a link, and consent.'},
        {status: 400}
      );
    }

    let mediaPath: string | null = null;

    if (file) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({error: 'File is too large. The current limit is 50MB.'}, {status: 400});
      }
      const mime = file.type || 'application/octet-stream';
      const allowed = ALLOWED_PREFIXES.some(p => mime.startsWith(p)) || ALLOWED_EXACT.includes(mime);
      if (!allowed) {
        return NextResponse.json({error: 'Unsupported file type. Upload an image, video, audio file, PDF or Word document.'}, {status: 400});
      }

      const admin = supabaseAdmin();
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads';
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `submissions/${randomUUID()}${ext ? `.${ext}` : ''}`;
      const bytes = new Uint8Array(await file.arrayBuffer());

      const {error: uploadError} = await admin.storage.from(bucket).upload(path, bytes, {contentType: mime});
      if (uploadError) {
        return NextResponse.json({error: `Upload failed: ${uploadError.message}`}, {status: 500});
      }
      mediaPath = path;
    } else if (mediaUrl) {
      try {
        const parsed = new URL(mediaUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        return NextResponse.json({error: 'The evidence link is not a valid http/https URL.'}, {status: 400});
      }
    }

    const admin = supabaseAdmin();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads';
    const {data, error} = await admin
      .from('submissions')
      .insert({
        title,
        description,
        location,
        event_date: eventDate,
        source_url: sourceUrl,
        uploader_name: uploaderName,
        media_path: mediaPath,
        media_url: mediaPath ? null : mediaUrl,
        thumbnail_url: thumbnailUrl,
        media_title: mediaTitle,
        consent,
        status: 'pending_review',
      })
      .select('id')
      .single();

    if (error) {
      if (mediaPath) await admin.storage.from(bucket).remove([mediaPath]).catch(() => {});
      return NextResponse.json({error: error.message}, {status: 500});
    }

    await logAudit('submission_created', 'submission', data.id, {title, ip});
    return NextResponse.json({ok: true, id: data.id});
  } catch (e: any) {
    return NextResponse.json({error: e?.message ?? 'Unexpected error while submitting evidence.'}, {status: 500});
  }
}
