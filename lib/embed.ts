export type Embed = {provider: 'youtube' | 'vimeo' | 'tiktok' | 'twitter' | 'instagram' | 'facebook' | 'threads' | 'file' | null; embedUrl: string | null};

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

/** Matches an individual Instagram post/reel/IGTV path, e.g. instagram.com/p/<id>/,
 *  instagram.com/reel/<id>/, instagram.com/tv/<id>/ — a profile link doesn't match. */
function extractInstagramPath(url: string): string | null {
  const m = url.match(/instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? `${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}` : null;
}

/** Matches an individual Threads post, e.g. threads.net/@user/post/<id>. */
function extractThreadsPath(url: string): string | null {
  const m = url.match(/threads\.net\/(@[^/]+)\/post\/([A-Za-z0-9_-]+)/i);
  return m ? `${m[1]}/post/${m[2]}` : null;
}

/** True for facebook.com/*, fb.watch/* links — both post and video URLs work
 *  with Facebook's plugin embeds, so no need to distinguish shapes here. */
function isFacebookUrl(url: string): boolean {
  return /(?:^|\/\/)(?:www\.|m\.|web\.)?facebook\.com\/|(?:^|\/\/)fb\.watch\//i.test(url);
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

  // Instagram and Threads both expose a plain "/embed" suffix on individual
  // posts that renders as a normal, unauthenticated iframe — no SDK script
  // or app credentials needed, same shape as YouTube/Vimeo/TikTok above.
  const igPath = extractInstagramPath(url);
  if (igPath) return {provider: 'instagram', embedUrl: `https://www.instagram.com/${igPath}/embed/captioned/`};

  const threadsPath = extractThreadsPath(url);
  if (threadsPath) return {provider: 'threads', embedUrl: `https://www.threads.net/${threadsPath}/embed`};

  // Facebook's plugin embeds also work as plain iframes: pass the original
  // post/video URL as `href`. Use the video plugin when the link looks like
  // a video so it renders as a clean player rather than a full post card.
  if (isFacebookUrl(url)) {
    const looksLikeVideo = /\/videos\/|watch\/?\?v=|fb\.watch\//i.test(url);
    const plugin = looksLikeVideo ? 'video' : 'post';
    return {provider: 'facebook', embedUrl: `https://www.facebook.com/plugins/${plugin}.php?href=${encodeURIComponent(url)}&show_text=false`};
  }

  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)) return {provider: 'file', embedUrl: url};

  return {provider: null, embedUrl: null};
}
