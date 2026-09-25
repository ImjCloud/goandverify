'use client';
import {useEffect, useState} from 'react';
import {getEmbed} from '@/lib/embed';

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

export function VideoHoverPreview({mediaUrl, thumbnail, alt, imgClassName}: {mediaUrl?: string | null; thumbnail: string; alt: string; imgClassName?: string}) {
  const canHover = useCanHover();
  const [hover, setHover] = useState(false);
  const embed = mediaUrl ? getEmbed(mediaUrl) : {provider: null, embedUrl: null};

  if (!embed.provider) {
    return <img src={thumbnail} alt={alt} className={imgClassName} />;
  }

  const videoId = embed.embedUrl?.split('/').pop();
  const previewSrc =
    embed.provider === 'youtube'
      ? `${embed.embedUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1`
      : embed.provider === 'vimeo'
      ? `${embed.embedUrl}?autoplay=1&muted=1&loop=1&background=1`
      : embed.embedUrl!;

  // On touch devices, never mount the hover preview — a tap should always
  // navigate through the link instead of getting eaten by a simulated
  // `:hover` state that swaps in a live iframe/video.
  const active = canHover && hover;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onMouseEnter={() => canHover && setHover(true)}
      onMouseLeave={() => canHover && setHover(false)}
    >
      <img src={thumbnail} alt={alt} className={`${imgClassName ?? ''} transition-opacity duration-200 ${active ? 'opacity-0' : 'opacity-100'}`} />
      {active &&
        (embed.provider === 'file' ? (
          <video src={previewSrc} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <iframe src={previewSrc} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media" title={alt} />
        ))}
    </div>
  );
}
