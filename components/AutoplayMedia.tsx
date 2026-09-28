'use client';
import {useEffect, useRef, useState} from 'react';
import {getEmbed} from '@/lib/embed';
import {getTweetVideoUrl} from '@/lib/twitterVideo';
import {MediaFallback} from '@/components/MediaFallback';

// Autoplay is deliberately driven by viewport visibility, never hover.
// A muted inline video can autoplay without a user gesture, but we only
// activate it when roughly 30% of its card is visible. This works on both
// pointer and touch devices because it uses IntersectionObserver rather than
// mouse events. Once the card drops below the visibility threshold, playback
// is stopped and the thumbnail is restored.
function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Do not use isIntersecting alone: that becomes true as soon as even
        // a single pixel enters the viewport. We specifically want ~30%.
        setInView(entry.isIntersecting && entry.intersectionRatio >= threshold);
      },
      {threshold: [0, threshold]},
    );

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
    return {kind: 'iframe', src: embed.embedUrl + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + id + '&modestbranding=1&playsinline=1'};
  }
  if (embed.provider === 'vimeo') return {kind: 'iframe', src: embed.embedUrl + '?autoplay=1&muted=1&loop=1&background=1&playsinline=1'};
  if (embed.provider === 'tiktok') return {kind: 'iframe', src: embed.embedUrl + '?autoplay=1&muted=1&controls=0&playsinline=1'};
  // Instagram's official embed is iframe-based. Mount it when the card is
  // visible and request muted autoplay; Instagram may still ignore autoplay
  // for embedded posts/reels, but the official playable embed remains visible.
  if (embed.provider === 'instagram') return {kind: 'iframe', src: embed.embedUrl + '?autoplay=1&muted=1'};
  return null;
}

export function AutoplayMedia({mediaUrl, thumbnail, alt, imgClassName}: {mediaUrl?: string | null; thumbnail?: string | null; alt: string; imgClassName?: string}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [twitterVideoSrc, setTwitterVideoSrc] = useState<string | null>(null);
  const embed = mediaUrl ? getEmbed(mediaUrl) : {provider: null, embedUrl: null};
  const isTwitter = embed.provider === 'twitter';

  // Resolve X's real underlying video only when the card crosses the viewport
  // threshold. This avoids firing lookups for off-screen cards.
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
  // Twitter needs the observed wrapper mounted before its video URL resolves.
  const observable = playMode !== null || isTwitter;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playMode?.kind !== 'video') return;
    if (inView) {
      video.play().catch(() => {
        // Muted + inline playback is eligible for autoplay; this catch keeps
        // a browser/device policy rejection from breaking the card.
      });
    } else {
      video.pause();
    }
  }, [inView, playMode?.kind, playMode?.src]);

  if (!observable) {
    return thumbnail ? <img src={thumbnail} alt={alt} className={imgClassName} /> : <MediaFallback className={imgClassName} />;
  }

  const active = inView && playMode !== null;
  const showVideo = playMode?.kind === 'video';
  const showIframe = active && playMode?.kind === 'iframe';

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      {thumbnail ? (
        <img src={thumbnail} alt={alt} className={`${imgClassName ?? ''} transition-opacity duration-300 ${active ? 'opacity-0' : 'opacity-100'}`} />
      ) : (
        <MediaFallback className={`${imgClassName ?? ''} transition-opacity duration-300 ${active ? 'opacity-0' : 'opacity-100'}`} />
      )}
      {showVideo && playMode && (
        <video
          ref={videoRef}
          src={playMode.src}
          muted
          loop
          playsInline
          preload="metadata"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {showIframe && playMode.kind === 'iframe' && (
        <iframe src={playMode.src} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" title={alt} />
      )}
    </div>
  );
}
