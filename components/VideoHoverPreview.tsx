'use client';
import {useEffect, useState} from 'react';
import {getEmbed} from '@/lib/embed';
import {getTweetVideoUrl} from '@/lib/twitterVideo';
import {MediaFallback} from '@/components/MediaFallback';

/** True only on devices with a real pointer that can hover (mouse/trackpad).
 *  Touch devices report `hover: none`, so this stays false there — matches
 *  and re-evaluates if the pointer type changes (e.g. a touchscreen laptop
 *  switching between touch and trackpad). */
function useCanHover() {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(hover: hover) and (pointer: fine)');
    setCanHover(mql.matches);
    const listener = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  return canHover;
}

type PlayMode = {kind: 'video'; src: string} | {kind: 'iframe'; src: string};

function getPlayMode(embed: ReturnType<typeof getEmbed>, twitterVideoSrc: string | null): PlayMode | null {
  if (embed.provider === 'file') return {kind: 'video', src: embed.embedUrl!};
  if (embed.provider === 'twitter') return twitterVideoSrc ? {kind: 'video', src: twitterVideoSrc} : null;
  if (embed.provider === 'youtube') {
    const id = embed.embedUrl?.split('/').pop();
    return {kind: 'iframe', src: `${embed.embedUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1`};
  }
  if (embed.provider === 'vimeo') return {kind: 'iframe', src: `${embed.embedUrl}?autoplay=1&muted=1&loop=1&background=1`};
  if (embed.provider === 'tiktok') return {kind: 'iframe', src: `${embed.embedUrl}?autoplay=1&muted=1&controls=0`};
  return null;
}

export function VideoHoverPreview({mediaUrl, thumbnail, alt, imgClassName}: {mediaUrl?: string | null; thumbnail?: string | null; alt: string; imgClassName?: string}) {
  const canHover = useCanHover();
  const [hover, setHover] = useState(false);
  const [twitterVideoSrc, setTwitterVideoSrc] = useState<string | null>(null);
  const embed = mediaUrl ? getEmbed(mediaUrl) : {provider: null, embedUrl: null};
  const isTwitter = embed.provider === 'twitter';

  // X has no chromeless autoplay iframe, so for a twitter post we resolve
  // the real underlying .mp4 (see lib/twitterVideo.ts) the first time it's
  // actually hovered — not on mount, so a page full of evidence cards
  // doesn't fire a request per card before anyone's looked at them.
  useEffect(() => {
    if (!isTwitter || !canHover || !hover || !embed.embedUrl || twitterVideoSrc) return;
    let cancelled = false;
    getTweetVideoUrl(embed.embedUrl).then(url => {
      if (!cancelled && url) setTwitterVideoSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [isTwitter, embed.embedUrl, canHover, hover, twitterVideoSrc]);

  const playMode = getPlayMode(embed, twitterVideoSrc);
  // Twitter still needs the hoverable wrapper (with its mouse handlers) even
  // before a video resolves — that hover is what triggers the lookup above.
  // Instagram/Facebook/Threads have no equivalent lookup, so they fall back
  // to a plain thumbnail: hover shows nothing extra, the real embed only
  // appears on click-through to the evidence detail page.
  const hoverable = playMode !== null || isTwitter;

  if (!hoverable) {
    return thumbnail ? <img src={thumbnail} alt={alt} className={imgClassName} /> : <MediaFallback className={imgClassName} />;
  }

  // On touch devices, never mount the hover preview — a tap should always
  // navigate through the link instead of getting eaten by a simulated
  // `:hover` state that swaps in a live iframe/video.
  const active = canHover && hover && playMode !== null;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onMouseEnter={() => canHover && setHover(true)}
      onMouseLeave={() => canHover && setHover(false)}
    >
      {thumbnail ? (
        <img src={thumbnail} alt={alt} className={`${imgClassName ?? ''} transition-opacity duration-200 ${active ? 'opacity-0' : 'opacity-100'}`} />
      ) : (
        <MediaFallback className={`${imgClassName ?? ''} transition-opacity duration-200 ${active ? 'opacity-0' : 'opacity-100'}`} />
      )}
      {active &&
        playMode &&
        (playMode.kind === 'video' ? (
          <video src={playMode.src} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <iframe src={playMode.src} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media" title={alt} />
        ))}
    </div>
  );
}
