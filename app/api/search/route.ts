import {NextRequest, NextResponse} from 'next/server';
import {searchEvidence} from '@/lib/evidenceSource';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const evidence = await searchEvidence(q);
  return NextResponse.json({evidence});
}
