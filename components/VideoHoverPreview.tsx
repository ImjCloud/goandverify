'use client';
import {useState} from 'react';
import {getEmbed} from '@/lib/embed';

export function VideoHoverPreview({mediaUrl, thumbnail, alt, imgClassName}: {mediaUrl?: string | null; thumbnail: string; alt: string; imgClassName?: string}) {
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

  return (
    <div className="relative h-full w-full overflow-hidden" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <img src={thumbnail} alt={alt} className={`${imgClassName ?? ''} transition-opacity duration-200 ${hover ? 'opacity-0' : 'opacity-100'}`} />
      {hover &&
        (embed.provider === 'file' ? (
          <video src={previewSrc} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <iframe src={previewSrc} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media" title={alt} />
        ))}
    </div>
  );
}
