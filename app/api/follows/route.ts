import {NextRequest, NextResponse} from 'next/server';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';
import {checkRateLimit, getClientIp} from '@/lib/rateLimit';

const FOLLOW_TYPES = new Set(['person', 'issue', 'location']);

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) return NextResponse.json({error: 'Following is not configured yet.'}, {status: 503});

  const ip = getClientIp(req);
  const rate = await checkRateLimit(`follow:${ip}`, 10, 3600);
  if (!rate.allowed) return NextResponse.json({error: 'Too many follow requests from this network. Please try again later.'}, {status: 429});

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const targetType = typeof body.targetType === 'string' ? body.targetType : '';
  const targetValue = typeof body.targetValue === 'string' ? body.targetValue.trim() : '';
  const electionCycle = typeof body.electionCycle === 'string' ? body.electionCycle.trim() : '2027';

  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({error: 'Enter a valid email address.'}, {status: 400});
  if (!FOLLOW_TYPES.has(targetType)) return NextResponse.json({error: 'Choose a person, issue, or location to follow.'}, {status: 400});
  if (targetValue.length < 2 || targetValue.length > 120) return NextResponse.json({error: 'Enter a follow target between 2 and 120 characters.'}, {status: 400});
  if (!/^20\d{2}$/.test(electionCycle)) return NextResponse.json({error: 'Enter a valid election cycle.'}, {status: 400});

  const admin = supabaseAdmin();
  const {data: existing, error: lookupError} = await admin
    .from('follow_subscriptions')
    .select('id')
    .eq('target_type', targetType)
    .eq('election_cycle', electionCycle)
    .ilike('email', email)
    .ilike('target_value', targetValue)
    .maybeSingle();

  if (lookupError) {
    console.error('Follow lookup failed:', lookupError);
    return NextResponse.json({error: 'Could not save this follow request.'}, {status: 500});
  }

  if (existing?.id) {
    const {error: updateError} = await admin
      .from('follow_subscriptions')
      .update({status: 'active', updated_at: new Date().toISOString()})
      .eq('id', existing.id);
    if (updateError) {
      console.error('Follow update failed:', updateError);
      return NextResponse.json({error: 'Could not save this follow request.'}, {status: 500});
    }
    return NextResponse.json({ok: true});
  }

  const {error: insertError} = await admin.from('follow_subscriptions').insert({
    email,
    target_type: targetType,
    target_value: targetValue,
    election_cycle: electionCycle,
    status: 'active',
  });

  if (insertError) {
    // A concurrent request may have created the same normalized subscription
    // between the lookup and insert. Reactivate that existing row rather than
    // surfacing a generic database error to the visitor.
    const {data: raced} = await admin
      .from('follow_subscriptions')
      .select('id')
      .eq('target_type', targetType)
      .eq('election_cycle', electionCycle)
      .ilike('email', email)
      .ilike('target_value', targetValue)
      .maybeSingle();

    if (raced?.id) {
      const {error: retryError} = await admin
        .from('follow_subscriptions')
        .update({status: 'active', updated_at: new Date().toISOString()})
        .eq('id', raced.id);
      if (!retryError) return NextResponse.json({ok: true});
    }

    console.error('Follow insert failed:', insertError);
    return NextResponse.json({error: 'Could not save this follow request.'}, {status: 500});
  }

  return NextResponse.json({ok: true});
}
