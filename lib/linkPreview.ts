import dns from 'dns/promises';

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

// Basic SSRF guard: refuse to let the server fetch internal/private
// addresses on the submitter's behalf (localhost, RFC1918 ranges, and the
// 169.254.169.254 link-local range used by cloud metadata services).
async function isPrivateHost(hostname: string): Promise<boolean> {
  if (['localhost', '0.0.0.0'].includes(hostname)) return true;
  try {
    const {address} = await dns.lookup(hostname);
    if (address === '127.0.0.1' || address.startsWith('127.')) return true;
    if (address.startsWith('10.')) return true;
    if (address.startsWith('192.168.')) return true;
    if (address.startsWith('169.254.')) return true;
    if (address === '::1') return true;
    const parts = address.split('.').map(Number);
    if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    return false;
  } catch {
    return true; // fail closed: if we can't resolve it, don't fetch it
  }
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
    const res = await fetch(rawUrl, {
      redirect: 'follow',
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

    const title = metaContent('og:title') ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
    const image = metaContent('og:image');
    return {mediaUrl: rawUrl, thumbnailUrl: image, title, mediaType: 'webpage'};
  } catch {
    return {mediaUrl: rawUrl, thumbnailUrl: null, title: null, mediaType: 'webpage'};
  }
}
