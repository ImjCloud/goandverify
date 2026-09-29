import dns from 'dns/promises';
import net from 'net';

export type LinkPreview = {
  mediaUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  mediaType: 'youtube' | 'vimeo' | 'image' | 'video-file' | 'webpage';
};

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /[?&]v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

// og:image / og:title values are pulled out of raw HTML with a regex, not an
// HTML parser, so any entity the source page encoded (X/Twitter's og:image
// is a real example: `...?format=webp&amp;name=large`) comes through as
// literal text instead of a decoded character. An `&amp;` left in a URL
// isn't a valid query-string separator, so the request 404s downstream and
// the image just looks "broken" with no error anywhere obvious. Decode the
// handful of entities that actually show up in meta tags before using the
// value for anything.
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

// Basic SSRF guard: refuse to let the server fetch internal/private
// addresses on the submitter's behalf (localhost, RFC1918 ranges, and the
// 169.254.169.254 link-local range used by cloud metadata services).
export async function isPrivateHost(hostname: string): Promise<boolean> {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (['localhost', '0.0.0.0', '::'].includes(normalized) || normalized.endsWith('.localhost')) return true;
  const isPrivateIp = (address: string) => {
    const ip = address.toLowerCase();
    if (net.isIPv4(ip)) {
      const parts = ip.split('.').map(Number);
      return parts[0] === 10 || parts[0] === 127 ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 169 && parts[1] === 254) ||
        (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127);
    }
    if (net.isIPv6(ip)) {
      return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb') || ip.startsWith('::ffff:127.') || ip.startsWith('::ffff:10.') || ip.startsWith('::ffff:192.168.');
    }
    return false;
  };
  if (net.isIP(normalized) && isPrivateIp(normalized)) return true;
  try {
    const addresses = await dns.lookup(normalized, {all: true});
    return addresses.some(({address}) => isPrivateIp(address));
  } catch {
    return true; // fail closed: if we can't resolve it, don't fetch it
  }
}

// A plain fetch() with redirect:'manual' — which we need so every hop can be
// re-checked against isPrivateHost before being followed, closing off a
// redirect-based SSRF bypass — silently stops at the first 3xx response
// instead of reaching real content. That's extremely common in practice
// (link shorteners, http→https canonicalization, a platform's own
// permalink redirects) and was quietly killing the thumbnail/title scrape
// for any such link with no error surfaced anywhere. Follow redirects
// ourselves instead, validating each new target the same way the first one
// was validated.
export async function safeFetch(startUrl: string, init: RequestInit, maxRedirects = 5): Promise<Response> {
  let current = startUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const u = new URL(current);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Unsupported protocol in redirect.');
    if (await isPrivateHost(u.hostname)) throw new Error('Redirect points to a private/internal address.');

    const res = await fetch(current, {...init, redirect: 'manual'});
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return res;
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects.');
}

/** X/Twitter status URLs sometimes carry a trailing /photo/N or /video/N when
 *  copied from the media viewer rather than the tweet itself. The canonical
 *  .../status/<id> form is what reliably serves og:image, so scrape that. */
function canonicalizeForScrape(rawUrl: string): string {
  const m = rawUrl.match(/^(https?:\/\/(?:www\.|m\.)?(?:twitter|x)\.com\/[^/]+\/status\/\d+)(?:\/(?:photo|video)\/\d+)?/i);
  return m ? m[1] : rawUrl;
}

export async function getLinkPreview(rawUrl: string): Promise<LinkPreview> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('That does not look like a valid link.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http/https links are supported.');
  }
  if (await isPrivateHost(url.hostname)) {
    throw new Error('That link points to a private/internal address and cannot be used.');
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  const path = url.pathname.toLowerCase();

  if (host === 'youtube.com' || host === 'youtu.be') {
    const id = extractYouTubeId(rawUrl);
    if (id) return {mediaUrl: rawUrl, thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`, title: null, mediaType: 'youtube'};
  }

  if (host === 'vimeo.com') {
    const id = extractVimeoId(rawUrl);
    if (id) {
      try {
        const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const data = await res.json();
          return {mediaUrl: rawUrl, thumbnailUrl: data.thumbnail_url ?? null, title: data.title ?? null, mediaType: 'vimeo'};
        }
      } catch {
        /* fall through to generic handling below */
      }
      return {mediaUrl: rawUrl, thumbnailUrl: null, title: null, mediaType: 'vimeo'};
    }
  }

  if (/\.(jpe?g|png|gif|webp|avif)$/i.test(path)) {
    return {mediaUrl: rawUrl, thumbnailUrl: rawUrl, title: null, mediaType: 'image'};
  }

  if (/\.(mp4|webm|mov|m4v)$/i.test(path)) {
    return {mediaUrl: rawUrl, thumbnailUrl: null, title: null, mediaType: 'video-file'};
  }

  // Generic webpage — read Open Graph tags for a preview image + title.
  try {
    const res = await safeFetch(canonicalizeForScrape(rawUrl), {
      signal: AbortSignal.timeout(6000),
      headers: {'User-Agent': 'Mozilla/5.0 (compatible; EvidenceGalleryLinkPreview/1.0)'},
    });
    if (!res.ok) return {mediaUrl: rawUrl, thumbnailUrl: null, title: null, mediaType: 'webpage'};

    let html = '';
    const reader = res.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      while (bytes < 250_000) {
        const {done, value} = await reader.read();
        if (done) break;
        html += decoder.decode(value, {stream: true});
        bytes += value.length;
      }
      reader.cancel().catch(() => {});
    } else {
      html = await res.text();
    }

    const metaContent = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'))?.[1] ??
      null;

    const rawTitle = metaContent('og:title') ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
    const rawImage = metaContent('og:image');
    const title = rawTitle ? decodeHtmlEntities(rawTitle) : null;
    const image = rawImage ? decodeHtmlEntities(rawImage) : null;
    return {mediaUrl: rawUrl, thumbnailUrl: image, title, mediaType: 'webpage'};
  } catch {
    return {mediaUrl: rawUrl, thumbnailUrl: null, title: null, mediaType: 'webpage'};
  }
}
