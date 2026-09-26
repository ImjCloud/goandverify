export type Embed = {provider: 'youtube' | 'vimeo' | 'tiktok' | 'twitter' | 'file' | null; embedUrl: string | null};

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

function extractTikTokId(url: string): string | null {
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/) || url.match(/tiktok\.com\/embed\/v2\/(\d+)/);
  return m ? m[1] : null;
}

/** True for a link to an individual post on X/Twitter (…/status/<id>), which is
 *  what actually carries embeddable media — a profile or search link isn't. */
function isTwitterStatusUrl(url: string): boolean {
  return /(?:^|\/\/)(?:www\.|m\.)?(?:twitter|x)\.com\/[^/]+\/status\/\d+/i.test(url);
}

/** Given a URL that may be a YouTube/Vimeo page or a direct video file, returns how to embed it. */
export function getEmbed(url: string | null | undefined): Embed {
  if (!url) return {provider: null, embedUrl: null};

  const ytId = extractYouTubeId(url);
  if (ytId) return {provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`};

  const vimeoId = extractVimeoId(url);
  if (vimeoId) return {provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}`};

  const tiktokId = extractTikTokId(url);
  if (tiktokId) return {provider: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${tiktokId}`};

  // X/Twitter has no simple id-based iframe endpoint like the ones above —
  // the official embed is the post's own URL rendered through their widgets.js
  // script (see components/TwitterEmbed.tsx), so embedUrl here is just the
  // post URL itself, not something meant to go directly into an <iframe src>.
  if (isTwitterStatusUrl(url)) return {provider: 'twitter', embedUrl: url};

  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)) return {provider: 'file', embedUrl: url};

  return {provider: null, embedUrl: null};
}
