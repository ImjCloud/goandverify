// X/Twitter's own embed widget (platform.twitter.com/widgets.js) has no
// "chromeless, silently-autoplaying" mode — that's a genuine platform
// limitation, not something this app was missing. What sites that *do* show
// an X video autoplaying inline are actually doing is pulling the real .mp4
// out of the post and playing it directly with a normal <video> tag — the
// same treatment YouTube/Vimeo/TikTok already get here.
//
// The way to get that URL without X API credentials is the same
// "syndication" endpoint their own widgets.js calls to render an embedded
// tweet (cdn.syndication.twimg.com) — it's the public, unauthenticated
// backend of the official embed product, not a private API, and it's the
// same technique used by well-known open-source tweet-embedding libraries.
// It is unofficial/undocumented for direct third-party use though, so it
// can change or rate-limit without notice — every call here is wrapped so a
// failure just means "no hover-autoplay for this one", never a broken page.

const videoUrlCache = new Map<string, Promise<string | null>>();

function extractTweetId(url: string): string | null {
  const m = url.match(/status\/(\d+)/);
  return m ? m[1] : null;
}

// The token X's own widgets.js derives from the tweet id — publicly known,
// not a secret; it's just a required query param shape, not an auth check.
function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

function bestMp4(variants: {content_type?: string; type?: string; bitrate?: number; url: string}[] | undefined): string | null {
  if (!variants?.length) return null;
  const mp4s = variants.filter(v => (v.content_type ?? v.type) === 'video/mp4');
  if (!mp4s.length) return null;
  return mp4s.reduce((best, v) => ((v.bitrate ?? 0) > (best.bitrate ?? 0) ? v : best), mp4s[0]).url;
}

async function resolve(id: string): Promise<string | null> {
  try {
    const token = syndicationToken(id);
    const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // The response shape for a tweet with video has varied over time between
    // a top-level `video.variants` and `mediaDetails[].video_info.variants` —
    // check both rather than assume one.
    return bestMp4(data?.video?.variants) ?? bestMp4(data?.mediaDetails?.[0]?.video_info?.variants) ?? null;
  } catch {
    return null; // network error, CORS block from a privacy extension, endpoint change, etc.
  }
}

/** Best-effort: resolves to a direct, playable .mp4 URL for an X/Twitter post
 *  that has a video, or null if it doesn't (a photo/text-only post) or the
 *  lookup failed for any reason. Cached per tweet id for the page session. */
export function getTweetVideoUrl(postUrl: string): Promise<string | null> {
  const id = extractTweetId(postUrl);
  if (!id) return Promise.resolve(null);
  let entry = videoUrlCache.get(id);
  if (!entry) {
    entry = resolve(id);
    videoUrlCache.set(id, entry);
  }
  return entry;
}
