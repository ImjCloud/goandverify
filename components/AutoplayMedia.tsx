'use client';
import {useEffect, useRef, useState} from 'react';
import {getEmbed} from '@/lib/embed';
import {getTweetVideoUrl} from '@/lib/twitterVideo';
import {MediaFallback} from '@/components/MediaFallback';

// Muted video is allowed to autoplay in every modern browser with no user
// gesture at all — hovering was never actually required. peterobi.online's
// cards just always play; this does the same, gated by IntersectionObserver
// so a page with many cards doesn't decode dozens of videos at once (plays
// once ~30% of the card is in view, pauses again once it scrolls away —
// still no hover, no click, just naturally on as you scroll past it).
function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {threshold});
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
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

export function AutoplayMedia({mediaUrl, thumbnail, alt, imgClassName}: {mediaUrl?: string | null; thumbnail?: string | null; alt: string; imgClassName?: string}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [twitterVideoSrc, setTwitterVideoSrc] = useState<string | null>(null);
  const embed = mediaUrl ? getEmbed(mediaUrl) : {provider: null, embedUrl: null};
  const isTwitter = embed.provider === 'twitter';

  // Resolve X's real underlying video the first time the card is actually
  // visible — not on mount, so a whole page of cards doesn't all fire a
  // lookup before the visitor has scrolled to any of them.
  useEffect(() => {
    if (!isTwitter || !inView || !embed.embedUrl || twitterVideoSrc) return;
    let cancelled = false;
    getTweetVideoUrl(embed.embedUrl).then(url => {
      if (!cancelled && url) setTwitterVideoSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [isTwitter, embed.embedUrl, inView, twitterVideoSrc]);

  const playMode = getPlayMode(embed, twitterVideoSrc);
  // Twitter needs the observed wrapper mounted even before a video resolves —
  // that's what makes `inView` become true and triggers the lookup above.
  // Instagram/Facebook/Threads/no-media items never resolve to anything
  // playable here, so they skip straight to a plain thumbnail.
  const observable = playMode !== null || isTwitter;

  if (!observable) {
    return thumbnail ? <img src={thumbnail} alt={alt} className={imgClassName} /> : <MediaFallback className={imgClassName} />;
  }

  const active = inView && playMode !== null;

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      {thumbnail ? (
        <img src={thumbnail} alt={alt} className={`${imgClassName ?? ''} transition-opacity duration-300 ${active ? 'opacity-0' : 'opacity-100'}`} />
      ) : (
        <MediaFallback className={`${imgClassName ?? ''} transition-opacity duration-300 ${active ? 'opacity-0' : 'opacity-100'}`} />
      )}
      {active &&
        (playMode.kind === 'video' ? (
          <video src={playMode.src} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <iframe src={playMode.src} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media" title={alt} />
        ))}
    </div>
  );
}
