import {NextRequest, NextResponse} from 'next/server';
import {getLinkPreview} from '@/lib/linkPreview';
import {checkRateLimit, getClientIp} from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`link-preview:${ip}`, 20, 600); // 20 previews/10min/IP
  if (!rl.allowed) {
    return NextResponse.json({error: 'Too many preview requests. Please slow down.'}, {status: 429});
  }

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
