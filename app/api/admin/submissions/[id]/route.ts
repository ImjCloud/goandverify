import {NextRequest, NextResponse} from 'next/server';
import {randomUUID} from 'crypto';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';
import {archiveUrl} from '@/lib/wayback';
import {isPrivateHost} from '@/lib/linkPreview';

const UI_TO_DB_VERIFICATION: Record<string, string> = {
  'User Submitted': 'submitted',
  'Under Review': 'under_review',
  'Source Verified': 'source_verified',
  'Partially Verified': 'partially_verified',
  Disputed: 'disputed',
  Archived: 'archived',
};

function slugify(title: string): string {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  return `${base || 'evidence'}-${Math.random().toString(36).slice(2, 7)}`;
}

function inferType(pathOrUrl: string | null): 'image' | 'video' | 'audio' | 'document' {
  const clean = (pathOrUrl ?? '').split('?')[0];
  const ext = clean.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) return 'audio';
  if (/youtube\.com|youtu\.be|vimeo\.com|tiktok\.com/i.test(pathOrUrl ?? '')) return 'video';
  if (/(?:^|\/\/)(?:www\.|m\.)?(?:twitter|x)\.com\/[^/]+\/status\/\d+/i.test(pathOrUrl ?? '')) return 'video';
  return 'document';
}

// A submission's thumbnail_url usually comes straight from another site's
// og:image (see lib/linkPreview.ts) — some of those are signed CDN URLs that
// expire, or otherwise stop resolving from our domain, which shows up later
// as a permanently broken image on published evidence with no obvious error.
// Download it once at approval time and keep our own copy in storage instead
// of hotlinking someone else's URL forever. Best-effort: on any failure, the
// caller just keeps using the original URL — this must never block approval.
async function rehostThumbnail(url: string, admin: ReturnType<typeof supabaseAdmin>, bucket: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (await isPrivateHost(parsed.hostname)) return null;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {'User-Agent': 'Mozilla/5.0 (compatible; EvidenceGalleryThumbnail/1.0)'},
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 15 * 1024 * 1024) return null;

    const ext = contentType.split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `thumbnails/${randomUUID()}.${ext}`;
    const {error} = await admin.storage.from(bucket).upload(path, bytes, {contentType});
    if (error) return null;

    return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  } catch {
    return null; // network error, timeout, bad URL, etc. — fall back to the original
  }
}

export async function PATCH(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});

  const {id} = await params;
  const body = await req.json().catch(() => ({} as any));
  const admin = supabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads';

  const {data: submission, error: fetchError} = await admin.from('submissions').select('*').eq('id', id).single();
  if (fetchError || !submission) return NextResponse.json({error: 'Submission not found.'}, {status: 404});

  if (body.status === 'approved') {
    const verificationUi: string = body.verification || 'User Submitted';
    const verificationDb = UI_TO_DB_VERIFICATION[verificationUi] || 'submitted';
    const storageUrl = submission.media_path
      ? admin.storage.from(bucket).getPublicUrl(submission.media_path).data.publicUrl
      : null;
    const mediaUrl = storageUrl ?? submission.media_url ?? null;
    let thumbnailUrl = submission.thumbnail_url ?? storageUrl ?? mediaUrl;
    // Only re-host a thumbnail that actually points at a third party — if it's
    // already our own uploaded-file storage URL, there's nothing to protect it from.
    if (thumbnailUrl && thumbnailUrl !== storageUrl) {
      const rehosted = await rehostThumbnail(thumbnailUrl, admin, bucket);
      if (rehosted) thumbnailUrl = rehosted;
    }
    const evidenceSlug = slugify(submission.title);

    const {data: evidenceRow, error: evidenceError} = await admin
      .from('evidence')
      .insert({
        slug: evidenceSlug,
        title: submission.title,
        type: inferType(submission.media_path ?? submission.media_url),
        description: submission.description,
        event_date: submission.event_date,
        location_city: submission.location,
        source_name: submission.uploader_name ? `Public submission — ${submission.uploader_name}` : 'Public submission',
        source_url: submission.source_url ?? (submission.media_path ? null : submission.media_url),
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        verification_status: verificationDb,
        uploader_name: submission.uploader_name,
        verified_at: ['source_verified', 'partially_verified'].includes(verificationDb) ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (evidenceError) return NextResponse.json({error: evidenceError.message}, {status: 500});

    const {error: updateError} = await admin
      .from('submissions')
      .update({
        status: 'approved',
        evidence_id: evidenceRow.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: body.notes ?? null,
      })
      .eq('id', id);
    if (updateError) return NextResponse.json({error: updateError.message}, {status: 500});

    await logAudit('submission_approved', 'submission', id, {evidenceId: evidenceRow.id, verification: verificationDb});
    await admin.from('activity_events').insert({event_type: 'evidence_published', title: submission.title, description: submission.description, href: `/evidence/${evidenceSlug}`});
    await admin.from('notification_events').insert({event_type: 'evidence_published', target_type: 'location', target_value: submission.location, title: `New evidence: ${submission.title}`, body: submission.description, href: `/evidence/${evidenceSlug}`});

    // Best-effort, non-blocking: archive the source so it survives if the
    // original page later goes offline. Never let this delay or fail approval.
    const urlToArchive = submission.source_url || (submission.media_path ? null : submission.media_url);
    if (urlToArchive) {
      archiveUrl(urlToArchive)
        .then(waybackUrl => {
          if (waybackUrl) admin.from('evidence').update({wayback_url: waybackUrl}).eq('id', evidenceRow.id);
        })
        .catch(() => {});
    }

    return NextResponse.json({ok: true, evidenceId: evidenceRow.id});
  }

  const dbStatus =
    body.status === 'rejected' ? 'rejected' : body.status === 'needs_more_information' ? 'needs_more_information' : 'under_review';

  const {error} = await admin
    .from('submissions')
    .update({status: dbStatus, reviewer_notes: body.notes ?? null, reviewed_at: new Date().toISOString()})
    .eq('id', id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  await logAudit(`submission_${dbStatus}`, 'submission', id, {notes: body.notes ?? null});
  return NextResponse.json({ok: true});
}
