import {NextRequest, NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';

export async function DELETE(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});
  const {id} = await params;

  const admin = supabaseAdmin();
  const {data: existing} = await admin.from('campaign_events').select('media_path').eq('id', id).single();
  const {error} = await admin.from('campaign_events').delete().eq('id', id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  if (existing?.media_path) {
    await admin.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads').remove([existing.media_path]);
  }
  await logAudit('campaign_event_deleted', 'campaign_event', id, {});
  return NextResponse.json({ok: true});
}
