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

  const {error} = await supabaseAdmin().from('follow_subscriptions').upsert({
    email,
    target_type: targetType,
    target_value: targetValue,
    election_cycle: electionCycle,
    status: 'active',
  }, {onConflict: 'email,target_type,target_value,election_cycle'});

  if (error) return NextResponse.json({error: 'Could not save this follow request.'}, {status: 500});
  return NextResponse.json({ok: true});
}
