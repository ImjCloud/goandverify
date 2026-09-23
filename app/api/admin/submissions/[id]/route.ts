import {NextRequest, NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';

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
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(pathOrUrl ?? '')) return 'video';
  return 'document';
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
    const thumbnailUrl = submission.thumbnail_url ?? storageUrl ?? mediaUrl;

    const {data: evidenceRow, error: evidenceError} = await admin
      .from('evidence')
      .insert({
        slug: slugify(submission.title),
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

    return NextResponse.json({ok: true, evidenceId: evidenceRow.id});
  }

  const dbStatus =
    body.status === 'rejected' ? 'rejected' : body.status === 'needs_more_information' ? 'needs_more_information' : 'under_review';

  const {error} = await admin
    .from('submissions')
    .update({status: dbStatus, reviewer_notes: body.notes ?? null, reviewed_at: new Date().toISOString()})
    .eq('id', id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  return NextResponse.json({ok: true});
}
