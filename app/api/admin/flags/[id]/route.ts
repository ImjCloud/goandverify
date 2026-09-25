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
  const {data: flag} = await admin.from('flags').select('evidence_id,evidence(id,title,slug,location_city,location_state,location_country)').eq('id', id).maybeSingle();
  const {error} = await admin
    .from('flags')
    .update({status, resolution_notes: body.notes ?? null, resolved_at: new Date().toISOString()})
    .eq('id', id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  if (status === 'resolved' && flag?.evidence) {
    const evidence = flag.evidence as any;
    const location = [evidence.location_city, evidence.location_state, evidence.location_country].filter(Boolean).join(', ') || 'public record';
    await admin.from('activity_events').insert({event_type: 'correction_resolved', title: `Correction resolved: ${evidence.title}`, description: body.notes || 'A reported issue was reviewed by a moderator.', href: `/evidence/${evidence.slug}`});
    await admin.from('notification_events').insert({event_type: 'correction_resolved', target_type: 'location', target_value: location, title: `Correction resolved: ${evidence.title}`, body: body.notes || 'A reported issue was reviewed by a moderator.', href: `/evidence/${evidence.slug}`});
  }

  await logAudit(`flag_${status}`, 'flag', id, {notes: body.notes ?? null});
  return NextResponse.json({ok: true});
}
