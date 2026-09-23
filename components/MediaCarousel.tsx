'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import type {GalleryItem} from '@/lib/data';

export function MediaCarousel({images,intervalMs=4200,dark=true}:{images:GalleryItem[];intervalMs?:number;dark?:boolean}){
  const [index,setIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const [reduced,setReduced]=useState(false);
  const timer=useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(()=>{
    const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange=()=>setReduced(mq.matches);
    mq.addEventListener('change',onChange);
    return ()=>mq.removeEventListener('change',onChange);
  },[]);

  useEffect(()=>{
    if(paused||reduced||images.length<=1)return;
    timer.current=setInterval(()=>setIndex(i=>(i+1)%images.length),intervalMs);
    return ()=>{if(timer.current)clearInterval(timer.current)};
  },[paused,reduced,images.length,intervalMs]);

  if(!images||images.length===0)return null;
  const go=(n:number)=>setIndex((n+images.length)%images.length);

  return (
    <div
      className="media-carousel relative"
      onMouseEnter={()=>setPaused(true)}
      onMouseLeave={()=>setPaused(false)}
      onFocus={()=>setPaused(true)}
      onBlur={()=>setPaused(false)}
    >
      <div className="mc-frame">
        {images.map((img,i)=>(
          <img
            key={img.src}
            src={img.src}
            alt={img.alt}
            className={`mc-slide ${i===index?'is-active':''}`}
            aria-hidden={i===index?undefined:true}
            loading={i===0?'eager':'lazy'}
          />
        ))}
        <div className="mc-vignette" />
        <div className="mc-caption">
          <span className="mc-caption-index">{String(index+1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}</span>
          <span className="mc-caption-text">{images[index].caption}</span>
        </div>
        <div className="mc-controls">
          <button aria-label="Previous photo" onClick={()=>go(index-1)} className="mc-btn"><ChevronLeft size={16}/></button>
          <button aria-label={paused?'Resume slideshow':'Pause slideshow'} onClick={()=>setPaused(p=>!p)} className="mc-btn">
            {paused||reduced?<Play size={14}/>:<Pause size={14}/>}
          </button>
          <button aria-label="Next photo" onClick={()=>go(index+1)} className="mc-btn"><ChevronRight size={16}/></button>
        </div>
      </div>
      <div className="mc-dots" role="tablist" aria-label="Gallery navigation">
        {images.map((_,i)=>(
          <button
            key={i}
            role="tab"
            aria-selected={i===index}
            aria-label={`Show photo ${i+1} of ${images.length}`}
            onClick={()=>go(i)}
            className={`mc-dot ${i===index?'is-active':''} ${dark?'':'mc-dot-light'}`}
          />
        ))}
      </div>
    </div>
  );
}
