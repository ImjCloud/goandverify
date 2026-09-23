export type Embed = {provider: 'youtube' | 'vimeo' | 'file' | null; embedUrl: string | null};

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

/** Given a URL that may be a YouTube/Vimeo page or a direct video file, returns how to embed it. */
export function getEmbed(url: string | null | undefined): Embed {
  if (!url) return {provider: null, embedUrl: null};

  const ytId = extractYouTubeId(url);
  if (ytId) return {provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`};

  const vimeoId = extractVimeoId(url);
  if (vimeoId) return {provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}`};

  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)) return {provider: 'file', embedUrl: url};

  return {provider: null, embedUrl: null};
}
