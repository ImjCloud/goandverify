import {NextResponse} from 'next/server';
import {getPublishedEvidence} from '@/lib/evidenceSource';

export async function GET() {
  const evidence = await getPublishedEvidence();
  return NextResponse.json({evidence});
}
