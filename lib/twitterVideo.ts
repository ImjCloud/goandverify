// X/Twitter post URLs are resolved server-side through /api/x-video.
// The browser cannot reliably call X's syndication endpoint directly because
// that endpoint restricts cross-origin browser requests. The server route avoids
// that CORS failure and returns a direct video.twimg.com MP4 URL when available.
//
// This is intentionally best-effort: if X changes or rate-limits its syndication
// endpoint, the evidence card still renders its thumbnail/link instead of failing.

const videoUrlCache = new Map<string, Promise<string | null>>();

function extractTweetId(url: string): string | null {
  const m = url.match(/(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/i);
  return m ? m[1] : null;
}

async function resolve(postUrl: string): Promise<string | null> {
  try {
    const res = await fetch('/api/x-video?url=' + encodeURIComponent(postUrl), {
      headers: {Accept: 'application/json'},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.videoUrl === 'string' ? data.videoUrl : null;
  } catch {
    return null;
  }
}

/** Resolves a public X post containing video to a direct playable MP4 URL.
 * The request is cached per tweet id for the current page session. */
export function getTweetVideoUrl(postUrl: string): Promise<string | null> {
  const id = extractTweetId(postUrl);
  if (!id) return Promise.resolve(null);

  let entry = videoUrlCache.get(id);
  if (!entry) {
    entry = resolve(postUrl);
    videoUrlCache.set(id, entry);
  }
  return entry;
}
