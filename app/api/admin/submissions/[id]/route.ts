import {NextRequest, NextResponse} from 'next/server';
import {randomUUID} from 'crypto';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';
import {archiveUrl} from '@/lib/wayback';
import {isPrivateHost, safeFetch} from '@/lib/linkPreview';

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
  if (/instagram\.com\/(p|reel|reels|tv)\//i.test(pathOrUrl ?? '')) return 'video';
  if (/threads\.net\/@[^/]+\/post\//i.test(pathOrUrl ?? '')) return 'video';
  if (/(?:^|\/\/)(?:www\.|m\.|web\.)?facebook\.com\/|(?:^|\/\/)fb\.watch\//i.test(pathOrUrl ?? '')) return 'video';
  return 'document';
}

async function rehostThumbnail(url: string, admin: ReturnType<typeof supabaseAdmin>, bucket: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (await isPrivateHost(parsed.hostname)) return null;
    const res = await safeFetch(url, {
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
    return null;
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

  if (body.action === 'archive') {
    if (!submission.evidence_id) return NextResponse.json({error: 'This submission has no published evidence record to archive.'}, {status: 400});
    const {error: archiveError} = await admin.from('evidence').update({verification_status: 'archived'}).eq('id', submission.evidence_id);
    if (archiveError) return NextResponse.json({error: archiveError.message}, {status: 500});
    await logAudit('evidence_archived', 'submission', id, {evidenceId: submission.evidence_id});
    return NextResponse.json({ok: true});
  }

  if (body.status === 'approved') {
    const verificationUi: string = body.verification || 'User Submitted';
    const verificationDb = UI_TO_DB_VERIFICATION[verificationUi] || 'submitted';
    const sourceType = inferType(submission.media_path ?? submission.media_url);

    // Campaign activity uses the same public submission form, but its carousel
    // is a separate publication gate: only image/video campaign submissions
    // can become campaign events, and they are created only by this admin
    // approval path.
    if (submission.event_category === 'campaign_activity' && !['image', 'video'].includes(sourceType)) {
      return NextResponse.json({error: 'Campaign activity must contain an image or video/link suitable for the campaign carousel.'}, {status: 400});
    }

    const storageUrl = submission.media_path ? admin.storage.from(bucket).getPublicUrl(submission.media_path).data.publicUrl : null;
    const mediaUrl = storageUrl ?? submission.media_url ?? null;
    const uploadIsImage = submission.media_path ? sourceType === 'image' : false;
    let thumbnailUrl: string | null = submission.thumbnail_url ?? (uploadIsImage ? storageUrl : null);

    if (thumbnailUrl && thumbnailUrl !== storageUrl) thumbnailUrl = await rehostThumbnail(thumbnailUrl, admin, bucket);
    const evidenceSlug = slugify(submission.title);

    const {data: evidenceRow, error: evidenceError} = await admin
      .from('evidence')
      .insert({
        slug: evidenceSlug,
        title: submission.title,
        type: sourceType,
        description: submission.description,
        event_date: submission.event_date,
        location_city: submission.location,
        source_name: submission.uploader_name ? `Public submission — ${submission.uploader_name}` : 'Public submission',
        source_url: submission.source_url ?? (submission.media_path ? null : submission.media_url),
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        verification_status: verificationDb,
        event_category: submission.event_category ?? 'campaign_activity',
        about_person: submission.about_person,
        uploader_name: submission.uploader_name,
        verified_at: ['source_verified', 'partially_verified'].includes(verificationDb) ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (evidenceError) return NextResponse.json({error: evidenceError.message}, {status: 500});

    let campaignEventId: string | null = null;
    if (submission.event_category === 'campaign_activity') {
      const {data: campaignEvent, error: campaignError} = await admin
        .from('campaign_events')
        .insert({
          title: submission.title,
          description: submission.description,
          event_date: submission.event_date,
          location: submission.location,
          media_type: sourceType,
          media_url: mediaUrl,
          media_path: submission.media_path,
          image_url: thumbnailUrl,
          href: submission.source_url ?? (submission.media_path ? null : submission.media_url),
          status: 'approved',
          submitter_name: submission.uploader_name,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin',
        })
        .select('id')
        .single();

      if (campaignError) {
        await admin.from('evidence').delete().eq('id', evidenceRow.id);
        return NextResponse.json({error: `Could not publish the campaign event: ${campaignError.message}`}, {status: 500});
      }
      campaignEventId = campaignEvent.id;
    }

    const {error: updateError} = await admin
      .from('submissions')
      .update({status: 'approved', evidence_id: evidenceRow.id, reviewed_at: new Date().toISOString(), reviewer_notes: body.notes ?? null})
      .eq('id', id);
    if (updateError) return NextResponse.json({error: updateError.message}, {status: 500});

    await logAudit('submission_approved', 'submission', id, {evidenceId: evidenceRow.id, campaignEventId, verification: verificationDb});
    await admin.from('activity_events').insert({event_type: 'evidence_published', title: submission.title, description: submission.description, href: `/evidence/${evidenceSlug}`});
    await admin.from('notification_events').insert({event_type: 'evidence_published', target_type: 'location', target_value: submission.location, title: `New evidence: ${submission.title}`, body: submission.description, href: `/evidence/${evidenceSlug}`});

    const urlToArchive = submission.source_url || (submission.media_path ? null : submission.media_url);
    if (urlToArchive) {
      archiveUrl(urlToArchive)
        .then(waybackUrl => {
          if (waybackUrl) admin.from('evidence').update({wayback_url: waybackUrl}).eq('id', evidenceRow.id);
        })
        .catch(() => {});
    }

    return NextResponse.json({ok: true, evidenceId: evidenceRow.id, campaignEventId});
  }

  const dbStatus = body.status === 'rejected' ? 'rejected' : body.status === 'needs_more_information' ? 'needs_more_information' : 'under_review';
  const {error} = await admin.from('submissions').update({status: dbStatus, reviewer_notes: body.notes ?? null, reviewed_at: new Date().toISOString()}).eq('id', id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  await logAudit(`submission_${dbStatus}`, 'submission', id, {notes: body.notes ?? null});
  return NextResponse.json({ok: true});
}

export async function DELETE(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});

  const {id} = await params;
  const admin = supabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads';
  const {data: submission, error: fetchError} = await admin.from('submissions').select('*').eq('id', id).single();
  if (fetchError || !submission) return NextResponse.json({error: 'Submission not found.'}, {status: 404});

  if (submission.evidence_id) {
    const {error: evidenceError} = await admin.from('evidence').delete().eq('id', submission.evidence_id);
    if (evidenceError) return NextResponse.json({error: evidenceError.message}, {status: 500});
  }
  if (submission.media_path) await admin.storage.from(bucket).remove([submission.media_path]);
  const {error: deleteError} = await admin.from('submissions').delete().eq('id', id);
  if (deleteError) return NextResponse.json({error: deleteError.message}, {status: 500});
  await logAudit('submission_deleted', 'submission', id, {evidenceId: submission.evidence_id ?? null});
  return NextResponse.json({ok: true});
}
