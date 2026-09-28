import {NextRequest, NextResponse} from 'next/server';

function extractTweetId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)((x|twitter)\.com)$/.test(parsed.hostname)) return null;
    const match = parsed.pathname.match(/\/status\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

function bestMp4(
  variants: Array<{content_type?: string; type?: string; bitrate?: number; url?: string}> | undefined,
): string | null {
  const mp4s = (variants ?? []).filter(
    variant => (variant.content_type ?? variant.type) === 'video/mp4' && typeof variant.url === 'string',
  );
  if (!mp4s.length) return null;
  return mp4s.reduce((best, variant) =>
    (variant.bitrate ?? 0) > (best.bitrate ?? 0) ? variant : best,
  ).url ?? null;
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('url')?.trim() ?? '';
  const id = extractTweetId(input);

  if (!id) {
    return NextResponse.json({error: 'Invalid X post URL'}, {status: 400});
  }

  try {
    const endpoint =
      'https://cdn.syndication.twimg.com/tweet-result' +
      '?id=' + encodeURIComponent(id) +
      '&token=' + encodeURIComponent(syndicationToken(id));

    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Googlebot',
        Accept: 'application/json',
      },
      next: {revalidate: 300},
    });

    if (!response.ok) {
      return NextResponse.json({videoUrl: null}, {status: 200});
    }

    const data = await response.json();

    const videoUrl =
      bestMp4(data?.video?.variants) ??
      bestMp4(data?.mediaDetails?.[0]?.video_info?.variants) ??
      bestMp4(data?.quoted_tweet?.mediaDetails?.[0]?.video_info?.variants);

    return NextResponse.json(
      {videoUrl, tweetId: id},
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch {
    return NextResponse.json({videoUrl: null, tweetId: id}, {status: 200});
  }
}
