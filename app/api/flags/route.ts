import {NextRequest, NextResponse} from 'next/server';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {checkRateLimit, getClientIp} from '@/lib/rateLimit';
import {logAudit} from '@/lib/auditLog';

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({error: 'Flagging is not configured yet.'}, {status: 503});
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`flag:${ip}`, 10, 3600); // 10 flags/hour/IP
  if (!rl.allowed) {
    return NextResponse.json({error: 'Too many reports from this network. Please try again later.'}, {status: 429});
  }

  const body = await req.json().catch(() => ({}));
  const evidenceId = typeof body.evidenceId === 'string' ? body.evidenceId : null;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const details = typeof body.details === 'string' ? body.details.trim() : null;
  const reporterEmail = typeof body.reporterEmail === 'string' ? body.reporterEmail.trim() : null;

  if (!evidenceId || !reason) {
    return NextResponse.json({error: 'Please select a reason for the report.'}, {status: 400});
  }

  const admin = supabaseAdmin();
  const {data, error} = await admin
    .from('flags')
    .insert({evidence_id: evidenceId, reason, details, reporter_email: reporterEmail, status: 'open'})
    .select('id')
    .single();

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  await logAudit('flag_created', 'flag', data.id, {evidenceId, reason, ip});
  return NextResponse.json({ok: true, id: data.id});
}
