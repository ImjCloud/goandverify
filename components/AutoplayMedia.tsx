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
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= threshold), {threshold:[0,threshold]});
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

type PlayMode = {kind:'video';src:string}|{kind:'iframe';src:string}|{kind:'image';src:string};
type MediaType = 'image'|'video'|'audio'|'document'|'statement'|'interview'|'event'|'news';

function getPlayMode(embed: ReturnType<typeof getEmbed>, twitterVideoSrc: string|null, mediaUrl?: string|null, mediaType?: MediaType): PlayMode|null {
  if (embed.provider==='file') return {kind:'video',src:embed.embedUrl!};
  if (embed.provider==='twitter') return twitterVideoSrc ? {kind:'video',src:twitterVideoSrc} : null;
  if (!embed.provider && mediaUrl && mediaType==='image') return {kind:'image',src:mediaUrl};
  if (!embed.provider && mediaUrl && mediaType==='video') return {kind:'video',src:mediaUrl};
  if (!embed.provider && mediaUrl && /\.(avif|gif|jpe?g|png|webp|svg)(\?.*)?$/i.test(mediaUrl)) return {kind:'image',src:mediaUrl};
  if (embed.provider==='youtube') { const id=embed.embedUrl?.split('/').pop(); return {kind:'iframe',src:embed.embedUrl+'?autoplay=1&mute=1&controls=0&loop=1&playlist='+id+'&modestbranding=1&playsinline=1'}; }
  if (embed.provider==='vimeo') return {kind:'iframe',src:embed.embedUrl+'?autoplay=1&muted=1&loop=1&background=1&playsinline=1'};
  if (embed.provider==='tiktok') return {kind:'iframe',src:embed.embedUrl+'?autoplay=1&muted=1&controls=0&playsinline=1'};
  if (embed.provider==='facebook') return {kind:'iframe',src:embed.embedUrl+'&autoplay=true'};
  if (embed.provider==='instagram') return {kind:'iframe',src:embed.embedUrl+'?autoplay=1&muted=1'};
  if (embed.provider==='threads') return {kind:'iframe',src:embed.embedUrl!};
  return null;
}

export function AutoplayMedia({mediaUrl,thumbnail,alt,imgClassName,mediaType,eager=false}:{mediaUrl?:string|null;thumbnail?:string|null;alt:string;imgClassName?:string;mediaType?:MediaType;eager?:boolean}) {
  const [ref,inView]=useInView<HTMLDivElement>();
  const shouldPlay=eager||inView;
  const [twitterVideoSrc,setTwitterVideoSrc]=useState<string|null>(null); const [twitterFailed,setTwitterFailed]=useState(false); const [twitterRetry,setTwitterRetry]=useState(0); const [videoReady,setVideoReady]=useState(false); const [iframeReady,setIframeReady]=useState(false); const [thumbnailFailed,setThumbnailFailed]=useState(false);
  const retryTimer=useRef<ReturnType<typeof setTimeout>|null>(null); const retryCountRef=useRef(0);
  const embed=mediaUrl?getEmbed(mediaUrl):{provider:null,embedUrl:null}; const isTwitter=embed.provider==='twitter';
  useEffect(()=>{setVideoReady(false);setIframeReady(false);setThumbnailFailed(false);setTwitterVideoSrc(null);setTwitterFailed(false);setTwitterRetry(0);retryCountRef.current=0;},[isTwitter,embed.embedUrl]);
  useEffect(()=>{if(!isTwitter||!embed.embedUrl)return;setTwitterFailed(false);setTwitterVideoSrc('/api/x-video/stream?url='+encodeURIComponent(embed.embedUrl)+'&retry='+twitterRetry);},[isTwitter,embed.embedUrl,twitterRetry]);
  useEffect(()=>{if(!isTwitter||!twitterFailed)return;if(retryCountRef.current>=5)return;if(retryTimer.current)clearTimeout(retryTimer.current);const delay=Math.min(900*2**retryCountRef.current,8000);retryTimer.current=setTimeout(()=>{retryCountRef.current+=1;setTwitterRetry(v=>v+1)},delay);return()=>{if(retryTimer.current)clearTimeout(retryTimer.current)}},[isTwitter,twitterFailed]);
  const playMode=getPlayMode(embed,twitterVideoSrc,mediaUrl,mediaType); const observable=playMode!==null||isTwitter; const videoRef=useRef<HTMLVideoElement|null>(null);
  useEffect(()=>{const video=videoRef.current;if(!video||playMode?.kind!=='video')return;video.muted=true;if(shouldPlay){void video.play().catch(()=>undefined)}else{video.pause();setVideoReady(false)}},[shouldPlay,playMode?.kind,playMode?.src]);
  const fallback=thumbnail&&!thumbnailFailed?<img src={thumbnail} alt={alt} className={imgClassName} onError={()=>setThumbnailFailed(true)}/>:<MediaFallback className={imgClassName}/>;
  if(!observable)return fallback;
  const activeVideo=shouldPlay&&playMode?.kind==='video'&&videoReady&&!twitterFailed; const activeIframe=shouldPlay&&playMode?.kind==='iframe'&&iframeReady; const activeImage=playMode?.kind==='image'; const active=activeVideo||activeIframe||activeImage; const showVideo=playMode?.kind==='video'&&!twitterFailed; const showIframe=shouldPlay&&playMode?.kind==='iframe'; const showImage=playMode?.kind==='image';
  return <div ref={ref} className="relative h-full w-full overflow-hidden"><div className={`absolute inset-0 transition-opacity duration-300 ${active?'opacity-0':'opacity-100'}`}>{fallback}</div>{showVideo&&playMode&&<video ref={videoRef} src={playMode.src} muted loop playsInline preload="auto" autoPlay onError={()=>{if(isTwitter){setTwitterFailed(true);setVideoReady(false)}}} onCanPlay={()=>{setVideoReady(true);if(shouldPlay)void videoRef.current?.play().catch(()=>undefined)}} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${activeVideo?'opacity-100':'opacity-0'}`}/>} {showIframe&&playMode.kind==='iframe'&&<iframe src={playMode.src} className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${activeIframe?'opacity-100':'opacity-0'}`} allow="autoplay; encrypted-media; picture-in-picture" title={alt} onLoad={()=>setIframeReady(true)}/>} {showImage&&playMode.kind==='image'&&<img src={playMode.src} alt={alt} className={`absolute inset-0 h-full w-full object-contain bg-black transition-opacity duration-300 ${activeImage?'opacity-100':'opacity-0'} ${imgClassName||''}`} onError={()=>setThumbnailFailed(true)}/>}</div>;
}
