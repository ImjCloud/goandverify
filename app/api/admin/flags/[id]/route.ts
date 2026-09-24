import {NextRequest, NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';

export async function PATCH(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});

  const {id} = await params;
  const body = await req.json().catch(() => ({} as any));
  const status = body.status === 'dismissed' ? 'dismissed' : 'resolved';

  const admin = supabaseAdmin();
  const {error} = await admin
    .from('flags')
    .update({status, resolution_notes: body.notes ?? null, resolved_at: new Date().toISOString()})
    .eq('id', id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  await logAudit(`flag_${status}`, 'flag', id, {notes: body.notes ?? null});
  return NextResponse.json({ok: true});
}
