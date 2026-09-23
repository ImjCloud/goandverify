import {NextRequest, NextResponse} from 'next/server';
import {getLinkPreview} from '@/lib/linkPreview';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const {url} = await req.json().catch(() => ({url: ''}));
  if (!url || typeof url !== 'string') {
    return NextResponse.json({error: 'Missing link.'}, {status: 400});
  }
  try {
    const preview = await getLinkPreview(url);
    return NextResponse.json(preview);
  } catch (e: any) {
    return NextResponse.json({error: e?.message ?? 'Could not preview that link.'}, {status: 400});
  }
}
