'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,CheckCircle2,AlertTriangle,Clock3,Archive} from 'lucide-react';
import type {Evidence} from '@/lib/data';
import {VideoHoverPreview} from '@/components/VideoHoverPreview';
import {MediaFallback} from '@/components/MediaFallback';

const icon=(v:Evidence['verification'])=>v==='Source Verified'||v==='Partially Verified'?<CheckCircle2 size={13}/>:v==='Disputed'?<AlertTriangle size={13}/>:v==='Archived'?<Archive size={13}/>:<Clock3 size={13}/>;

export function EvidenceCarousel({items}:{items:Evidence[]}){
  const [active,setActive]=useState<number|null>(null);

  return (
    <>
      {/* Desktop / tablet: expanding-panel rail */}
      <div className="ev-rail hidden md:flex" onMouseLeave={()=>setActive(null)}>
        {items.map((item,i)=>{
          const isActive=active===i;
          const grow=active===null?1:isActive?7:0.55;
          return (
            <Link
              key={item.id}
              href={`/evidence/${item.slug}`}
              className={`ev-panel ${isActive?'is-active':''}`}
              aria-label={`View evidence: ${item.title}`}
              style={{flexGrow:grow}}
              onMouseEnter={()=>setActive(i)}
              onFocus={()=>setActive(i)}
            >
              <div className="ev-panel-media">
                {item.type==='video'?<VideoHoverPreview mediaUrl={item.mediaUrl} thumbnail={item.image} alt={item.title} imgClassName="ev-panel-img"/>:item.image?<img src={item.image} alt={item.title} className="ev-panel-img"/>:<MediaFallback className="ev-panel-img"/>}
                <span className="ev-panel-type">{item.type}</span>
                <span className="ev-panel-vertical editorial-serif">{item.title}</span>
              </div>
              <div className="ev-panel-summary">
                <div className="ev-panel-meta">
                  <span>{item.year} · {item.location}</span>
                  <span className="inline-flex items-center gap-1">{icon(item.verification)} {item.verification}</span>
                </div>
                <h3 className="editorial-serif ev-panel-title">{item.title}</h3>
                <p className="ev-panel-desc">{item.description}</p>
                <div className="ev-panel-source">
                  <span>{item.author}</span>
                  <span className="font-semibold">Source: {item.source}</span>
                </div>
                <span className="ev-panel-cta">View evidence <ArrowUpRight size={14}/></span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Mobile: swipeable snap carousel */}
      <div className="ev-mobile-rail flex md:hidden">
        {items.map(item=>(
          <Link key={item.id} href={`/evidence/${item.slug}`} className="ev-mobile-card">
            <div className="relative aspect-[4/3] overflow-hidden bg-black">
              {item.type==='video'?<VideoHoverPreview mediaUrl={item.mediaUrl} thumbnail={item.image} alt={item.title} imgClassName="h-full w-full object-cover"/>:item.image?<img src={item.image} alt={item.title} className="h-full w-full object-cover"/>:<MediaFallback className="h-full w-full object-cover"/>}
              <div className="absolute left-4 top-4 rounded-full bg-[var(--paper)]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ink)]">{item.type}</div>
            </div>
            <div className="p-5">
              <div className="mb-3 flex justify-between gap-3 text-[10px] uppercase tracking-widest text-[var(--muted)]">
                <span>{item.year} · {item.location}</span>
                <span className="inline-flex items-center gap-1">{icon(item.verification)} {item.verification}</span>
              </div>
              <h3 className="editorial-serif text-2xl leading-tight">{item.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold">View evidence <ArrowUpRight size={14}/></span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
