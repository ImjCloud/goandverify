import {NextRequest, NextResponse} from 'next/server';
import {randomUUID} from 'crypto';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {checkRateLimit, getClientIp} from '@/lib/rateLimit';
import {getLinkPreview} from '@/lib/linkPreview';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

/** What kind of media this advert actually has, inferred automatically
 * rather than asked of the advertiser (that dropdown used to be validated
 * against the uploaded file's exact MIME type, which some browsers/OSes
 * leave blank even for a perfectly valid file — causing a correctly
 * uploaded file to be rejected as "not matching the selected format"). */
function inferMediaKind(file: File | null, mediaUrl: string): 'image' | 'video' | 'link' {
  if (file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (file.type.startsWith('image/') || IMAGE_EXT.test(`.${ext}`)) return 'image';
    if (file.type.startsWith('video/') || VIDEO_EXT.test(`.${ext}`)) return 'video';
    return 'link'; // caller rejects an unsupported uploaded file type before this matters
  }
  if (mediaUrl) {
    const clean = mediaUrl.split('?')[0];
    if (IMAGE_EXT.test(clean)) return 'image';
    if (VIDEO_EXT.test(clean)) return 'video';
  }
  return 'link';
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 31 * 1024 * 1024) return NextResponse.json({error: 'Advert upload is too large.'}, {status: 413});
  if (!supabaseConfigured) return NextResponse.json({error: 'Advertising requests are not configured yet.'}, {status: 503});
  const rate = await checkRateLimit(`ad-request:${getClientIp(req)}`, 3, 3600);
  if (!rate.allowed) return NextResponse.json({error: 'Too many advert requests from this network. Please try again later.'}, {status: 429});

  const form = await req.formData();
  const value = (key: string) => String(form.get(key) ?? '').trim();
  const advertiserName = value('advertiserName');
  const contactEmail = value('contactEmail').toLowerCase();
  const contactWhatsapp = value('contactWhatsapp');
  const title = value('title');
  const description = value('description');
  const mediaUrl = value('mediaUrl');
  const targetUrl = value('targetUrl');
  const startDate = value('startDate') || null;
  const endDate = value('endDate') || null;
  const rightsConfirmed = form.get('rightsConfirmed') === 'true';
  // An untouched <input type="file"> still shows up in FormData as an empty
  // File (name: '', size: 0) — it IS an instanceof File, so checking that
  // alone can't tell "a file was uploaded" from "the field was left blank".
  // .size > 0 is what actually distinguishes them.
  const rawFile = form.get('mediaFile');
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  const emailValid = !contactEmail || /^\S+@\S+\.\S+$/.test(contactEmail);
  const whatsappDigits = contactWhatsapp.replace(/[\s\-().]/g, '');
  const whatsappValid = !contactWhatsapp || /^\+?[0-9]{7,15}$/.test(whatsappDigits);

  if (!advertiserName || !title || !description || !targetUrl || !rightsConfirmed) {
    return NextResponse.json({error: 'Complete the required advert fields.'}, {status: 400});
  }
  if (!contactEmail && !contactWhatsapp) {
    return NextResponse.json({error: 'Provide a contact email or a WhatsApp number so we can reach you about your advert.'}, {status: 400});
  }
  if (!emailValid) {
    return NextResponse.json({error: 'Enter a valid contact email, or leave it blank if you gave a WhatsApp number.'}, {status: 400});
  }
  if (!whatsappValid) {
    return NextResponse.json({error: 'Enter a valid WhatsApp number, including country code.'}, {status: 400});
  }
  if (startDate && endDate && startDate > endDate) return NextResponse.json({error: 'The end date must be after the start date.'}, {status: 400});
  for (const link of [targetUrl, mediaUrl].filter(Boolean)) {
    try { const url = new URL(link as string); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { return NextResponse.json({error: 'Links must use http or https.'}, {status: 400}); }
  }

  const mediaType = inferMediaKind(file, mediaUrl);
  let storedMediaUrl = mediaUrl || null;
  let imageUrl: string | null = null;
  let mediaPath: string | null = null;

  if (file) {
    if (file.size > 30 * 1024 * 1024) return NextResponse.json({error: 'Upload an image or video file up to 30MB.'}, {status: 400});
    if (mediaType !== 'image' && mediaType !== 'video') return NextResponse.json({error: 'That file type isn\u2019t supported \u2014 upload an image or a video.'}, {status: 400});
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads';
    const extension = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    mediaPath = `adverts/${randomUUID()}.${extension}`;
    const admin = supabaseAdmin();
    const upload = await admin.storage.from(bucket).upload(mediaPath, new Uint8Array(await file.arrayBuffer()), {contentType: file.type || undefined});
    if (upload.error) return NextResponse.json({error: 'Could not upload the advert media.'}, {status: 500});
    storedMediaUrl = admin.storage.from(bucket).getPublicUrl(mediaPath).data.publicUrl;
    if (mediaType === 'image') imageUrl = storedMediaUrl;
  } else if (mediaType === 'link') {
    // No file and no direct image/video URL was given — best-effort pull a
    // preview image from whichever link we have (the media link if one was
    // pasted even though it wasn't a direct file, else the destination
    // link itself), the same way evidence submissions get their thumbnail.
    // Never blocks the request if this fails.
    try {
      const preview = await getLinkPreview(mediaUrl || targetUrl);
      if (preview.thumbnailUrl) imageUrl = preview.thumbnailUrl;
    } catch {
      // no preview available — the carousel already has a plain-link fallback card
    }
  }

  const {error} = await supabaseAdmin().from('ad_requests').insert({
    advertiser_name: advertiserName, contact_email: contactEmail || null, contact_whatsapp: contactWhatsapp || null, title, description,
    rights_confirmed: rightsConfirmed, media_type: mediaType, media_url: storedMediaUrl, media_path: mediaPath, image_url: imageUrl, target_url: targetUrl, start_date: startDate, end_date: endDate,
    status: 'pending',
  });
  if (error) {
    if (mediaPath) await supabaseAdmin().storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads').remove([mediaPath]);
    return NextResponse.json({error: 'Could not save the advert request.'}, {status: 500});
  }
  return NextResponse.json({ok: true});
}
