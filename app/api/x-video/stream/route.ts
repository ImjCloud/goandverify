import {NextRequest, NextResponse} from 'next/server';

function extractTweetId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)((x|twitter)\.com)$/.test(parsed.hostname)) return null;
    return parsed.pathname.match(/\/status\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

function findMp4(data: any): string | null {
  const groups = [
    data?.video?.variants,
    ...(Array.isArray(data?.mediaDetails) ? data.mediaDetails.map((m: any) => m?.video_info?.variants) : []),
    ...(Array.isArray(data?.quoted_tweet?.mediaDetails)
      ? data.quoted_tweet.mediaDetails.map((m: any) => m?.video_info?.variants)
      : []),
  ];

  const variants = groups.flatMap((v: any) => Array.isArray(v) ? v : []);
  const mp4 = variants
    .filter((v: any) => (v?.content_type ?? v?.type) === 'video/mp4' && typeof v?.url === 'string')
    .sort((a: any, b: any) => (b?.bitrate ?? 0) - (a?.bitrate ?? 0))[0];

  return mp4?.url ?? null;
}

async function resolveXVideo(tweetUrl: string): Promise<string | null> {
  const id = extractTweetId(tweetUrl);
  if (!id) return null;

  const endpoint = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(id)}&token=${encodeURIComponent(syndicationToken(id))}`;
  const response = await fetch(endpoint, {
    headers: { 'User-Agent': 'Googlebot', Accept: 'application/json' },
    next: { revalidate: 300 },
  });
  if (!response.ok) return null;

  return findMp4(await response.json());
}

export async function GET(request: NextRequest) {
  const tweetUrl = request.nextUrl.searchParams.get('url')?.trim() ?? '';
  const source = await resolveXVideo(tweetUrl);
  if (!source) return NextResponse.json({error: 'X video unavailable'}, {status: 404});

  let upstream: Response;
  try {
    const range = request.headers.get('range');
    upstream = await fetch(source, {
      headers: range ? {Range: range} : undefined,
      redirect: 'follow',
    });
  } catch {
    return NextResponse.json({error: 'Unable to fetch X video'}, {status: 502});
  }

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({error: 'X video upstream unavailable'}, {status: 502});
  }

  const headers = new Headers();
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  headers.set('X-Content-Type-Options', 'nosniff');

  return new NextResponse(upstream.body, {status: upstream.status, headers});
}
