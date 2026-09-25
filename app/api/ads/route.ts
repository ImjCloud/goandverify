import {NextRequest, NextResponse} from 'next/server';
import {randomUUID} from 'crypto';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {checkRateLimit, getClientIp} from '@/lib/rateLimit';

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
  const mediaType = value('mediaType') === 'video' || value('mediaType') === 'link' ? value('mediaType') as 'video' | 'link' : 'image';
  const mediaUrl = value('mediaUrl');
  const imageUrl = value('imageUrl') || null;
  const targetUrl = value('targetUrl');
  const startDate = value('startDate') || null;
  const endDate = value('endDate') || null;
  const rightsConfirmed = form.get('rightsConfirmed') === 'true';
  const file = form.get('mediaFile') instanceof File ? form.get('mediaFile') as File : null;

  const emailValid = !contactEmail || /^\S+@\S+\.\S+$/.test(contactEmail);
  const whatsappDigits = contactWhatsapp.replace(/[\s\-().]/g, '');
  const whatsappValid = !contactWhatsapp || /^\+?[0-9]{7,15}$/.test(whatsappDigits);

  if (!advertiserName || !title || !description || !targetUrl || (!mediaUrl && !file) || !rightsConfirmed) {
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
  for (const link of [targetUrl, mediaUrl, imageUrl].filter(Boolean)) {
    try { const url = new URL(link as string); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { return NextResponse.json({error: 'Links must use http or https.'}, {status: 400}); }
  }

  let storedMediaUrl = mediaUrl || null;
  let mediaPath: string | null = null;
  if (file) {
    if (mediaType === 'link' || file.size > 30 * 1024 * 1024) return NextResponse.json({error: 'Upload an image or video file up to 30MB.'}, {status: 400});
    const allowed = mediaType === 'video' ? file.type.startsWith('video/') : file.type.startsWith('image/');
    if (!allowed) return NextResponse.json({error: 'The uploaded file does not match the selected advert format.'}, {status: 400});
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads';
    const extension = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    mediaPath = `adverts/${randomUUID()}.${extension}`;
    const admin = supabaseAdmin();
    const upload = await admin.storage.from(bucket).upload(mediaPath, new Uint8Array(await file.arrayBuffer()), {contentType: file.type});
    if (upload.error) return NextResponse.json({error: 'Could not upload the advert media.'}, {status: 500});
    storedMediaUrl = admin.storage.from(bucket).getPublicUrl(mediaPath).data.publicUrl;
  }

  const {error} = await supabaseAdmin().from('ad_requests').insert({
    advertiser_name: advertiserName, contact_email: contactEmail || null, contact_whatsapp: contactWhatsapp || null, title, description,
    rights_confirmed: rightsConfirmed, media_type: mediaType, media_url: storedMediaUrl, media_path: mediaPath, image_url: imageUrl || (mediaType === 'image' ? storedMediaUrl : null), target_url: targetUrl, start_date: startDate, end_date: endDate,
    status: 'pending',
  });
  if (error) {
    if (mediaPath) await supabaseAdmin().storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads').remove([mediaPath]);
    return NextResponse.json({error: 'Could not save the advert request.'}, {status: 500});
  }
  return NextResponse.json({ok: true});
}