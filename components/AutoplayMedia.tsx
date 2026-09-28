'use client';
import {useEffect, useRef, useState} from 'react';
import {getEmbed} from '@/lib/embed';
import {MediaFallback} from '@/components/MediaFallback';

function useInView<T extends HTMLElement>(threshold = 0.1) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= threshold), {threshold: [0, threshold]});
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
  if (embed.provider === 'facebook') return {kind: 'iframe', src: embed.embedUrl + '&autoplay=true'};
  if (embed.provider === 'instagram') return {kind: 'iframe', src: embed.embedUrl + '?autoplay=1&muted=1'};
  return null;
}

export function AutoplayMedia({mediaUrl, thumbnail, alt, imgClassName}: {mediaUrl?: string | null; thumbnail?: string | null; alt: string; imgClassName?: string}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [twitterVideoSrc, setTwitterVideoSrc] = useState<string | null>(null);
  const [twitterFailed, setTwitterFailed] = useState(false);
  const embed = mediaUrl ? getEmbed(mediaUrl) : {provider: null, embedUrl: null};
  const isTwitter = embed.provider === 'twitter';

  useEffect(() => {
    if (!isTwitter || !inView || !embed.embedUrl || twitterVideoSrc || twitterFailed) return;
    // Use a same-origin streaming endpoint. This avoids browser CORS/referrer
    // restrictions against video.twimg.com while preserving native <video>
    // autoplay, range requests, seeking, and buffering.
    setTwitterVideoSrc('/api/x-video/stream?url=' + encodeURIComponent(embed.embedUrl));
  }, [isTwitter, embed.embedUrl, inView, twitterVideoSrc, twitterFailed]);

  const playMode = getPlayMode(embed, twitterVideoSrc);
  const observable = playMode !== null || isTwitter;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playMode?.kind !== 'video') return;
    if (inView) {
      video.muted = true;
      video.defaultMuted = true;
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [inView, playMode?.kind, playMode?.src]);

  if (!observable) return thumbnail ? <img src={thumbnail} alt={alt} className={imgClassName} /> : <MediaFallback className={imgClassName} />;

  const active = inView && playMode !== null && !twitterFailed;
  const showVideo = playMode?.kind === 'video' && !twitterFailed;
  const showIframe = active && playMode?.kind === 'iframe';

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      {thumbnail ? <img src={thumbnail} alt={alt} className={`${imgClassName ?? ''} transition-opacity duration-300 ${active ? 'opacity-0' : 'opacity-100'}`} /> : <MediaFallback className={`${imgClassName ?? ''} transition-opacity duration-300 ${active ? 'opacity-0' : 'opacity-100'}`} />}
      {showVideo && playMode && <video ref={videoRef} src={playMode.src} muted loop playsInline preload="auto" autoPlay onError={() => isTwitter && setTwitterFailed(true)} onCanPlay={() => { if (inView) void videoRef.current?.play().catch(() => undefined); }} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`} />}
      {showIframe && playMode.kind === 'iframe' && <iframe src={playMode.src} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" title={alt} />}
    </div>
  );
}
