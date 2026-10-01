import {safeFetch} from '@/lib/linkPreview';

export function getInstagramUsername(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '').toLowerCase();
    if (host !== 'instagram.com') return null;
    const first = url.pathname.split('/').filter(Boolean)[0];
    if (!first || ['p','reel','reels','tv','stories','explore','accounts'].includes(first.toLowerCase())) return null;
    return first.replace(/[^a-zA-Z0-9._]/g, '') || null;
  } catch {
    return null;
  }
}

function extractMeta(html: string, property: string): string | null {
  return html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'))?.[1] ?? null;
}

function decode(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

/** Resolve a public Instagram profile link to its current profile thumbnail.
 * Uses Instagram's public page metadata first, then the public web-profile
 * endpoint as a fallback. If Instagram changes either surface, callers can
 * safely fall back to their normal generic link preview. */
export async function getInstagramThumbnail(rawUrl: string): Promise<string | null> {
  const username = getInstagramUsername(rawUrl);
  if (!username) return null;
  const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;

  try {
    const page = await safeFetch(profileUrl, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoAndVerifyAdPreview/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (page.ok) {
      const html = await page.text();
      const image = extractMeta(html, 'og:image');
      if (image) return decode(image);
      const jsonLd = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
      if (jsonLd) {
        try {
          const data = JSON.parse(jsonLd);
          const imageUrl = typeof data?.image === 'string' ? data.image : Array.isArray(data?.image) ? data.image[0] : null;
          if (imageUrl) return imageUrl;
        } catch {}
      }
    }
  } catch {}

  try {
    const endpoint = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const response = await safeFetch(endpoint, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoAndVerifyAdPreview/1.0)',
        'Accept': 'application/json',
        'X-IG-App-ID': '936619743392459',
      },
    });
    if (response.ok) {
      const data = await response.json();
      return data?.data?.user?.profile_pic_url_hd ?? data?.data?.user?.profile_pic_url ?? null;
    }
  } catch {}
  return null;
}
