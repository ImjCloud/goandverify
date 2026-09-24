import {NextResponse} from 'next/server';
import {getPublishedEvidence} from '@/lib/evidenceSource';

// Without this, Next.js can statically cache this route at build time (it has
// no cookies/headers read to auto-detect dynamic behaviour), which would
// freeze the evidence list at whatever it was during the last deploy — so a
// moderator approving something afterward would never see it show up on the
// public /evidence search page until the next deploy. force-dynamic makes
// every request re-fetch from Supabase.
export const dynamic = 'force-dynamic';

export async function GET() {
  const evidence = await getPublishedEvidence();
  return NextResponse.json({evidence});
}
