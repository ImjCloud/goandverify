'use client';

import {useEffect,useState} from 'react';
import type {MouseEvent} from 'react';
import {getEmbed} from '@/lib/embed';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,CheckCircle2,AlertTriangle,Clock3,Archive} from 'lucide-react';
import type {Evidence} from '@/lib/data';
import {AutoplayMedia} from '@/components/AutoplayMedia';
import {MediaFallback} from '@/components/MediaFallback';

const PAGE_SIZE=5;
const icon=(v:Evidence['verification'])=>v==='Source Verified'||v==='Partially Verified'?<CheckCircle2 size={13}/>:v==='Disputed'?<AlertTriangle size={13}/>:v==='Archived'?<Archive size={13}/>:<Clock3 size={13}/>;

export function EvidenceCarousel({items}:{items:Evidence[]}){
 const [page,setPage]=useState(0);const [active,setActive]=useState<number|null>(null);const [edgeLock,setEdgeLock]=useState(false);
 const pageCount=Math.max(1,Math.ceil(items.length/PAGE_SIZE));
 const visible=items.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
 useEffect(()=>{if(page>=pageCount)setPage(0)},[page,pageCount]);
 useEffect(()=>{setActive(null);setEdgeLock(false)},[page]);
 const nextPage=()=>{if(edgeLock||pageCount<2)return;setEdgeLock(true);setPage(v=>(v+1)%pageCount);window.setTimeout(()=>setEdgeLock(false),900)};
 const handleMove=(e:MouseEvent<HTMLDivElement>)=>{if(active!==visible.length-1||pageCount<2||edgeLock)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX-r.left>r.width*.82)nextPage()};
 return <>
  <div className="hidden md:block" onMouseMove={handleMove}>
   <div className="ev-rail" onMouseLeave={()=>setActive(null)}>
    {visible.map((item,i)=>{const provider=getEmbed(item.mediaUrl||item.sourceUrl)?.provider;const playable=item.type==='video'||['youtube','vimeo','tiktok','twitter','instagram','facebook'].includes(provider||'');const isActive=i===active;return <Link key={item.id} href={`/evidence/${item.slug}`} className={`ev-panel ${isActive?'is-active':''}`} aria-label={`View evidence: ${item.title}`} style={{flexGrow:active===null?1:isActive?7:.55}} onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} tabIndex={0}><div className="ev-panel-media">{playable?<AutoplayMedia mediaUrl={item.mediaUrl||item.sourceUrl} thumbnail={item.image} alt={item.title} imgClassName="ev-panel-img"/>:item.image?<img src={item.image} alt={item.title} className="ev-panel-img"/>:<MediaFallback className="ev-panel-img"/>}<span className="ev-panel-type">{item.type}</span>{!isActive&&<span className="ev-panel-vertical editorial-serif">{item.title}</span>}</div><div className="ev-panel-summary"><div className="ev-panel-meta"><span>{item.year} · {item.location}</span><span className="inline-flex items-center gap-1">{icon(item.verification)} {item.verification}</span></div><h3 className="editorial-serif ev-panel-title">{item.title}</h3><p className="ev-panel-desc">{item.description}</p><div className="ev-panel-source"><span>{item.author}</span><span className="font-semibold">Source: {item.source}</span></div><span className="ev-panel-cta">View evidence <ArrowUpRight size={14}/></span></div></Link>})}
   </div>
   {pageCount>1&&<div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]"><span>Set {page+1} of {pageCount} · Move to the right edge to load more evidence</span><button onClick={nextPage} className="inline-flex items-center gap-1 font-bold text-[var(--accent)]">Next set <ArrowRight size={14}/></button></div>}
  </div>
  <div className="ev-mobile-rail flex md:hidden">
   {visible.map(item=>{const provider=getEmbed(item.mediaUrl||item.sourceUrl)?.provider;const playable=item.type==='video'||['youtube','vimeo','tiktok','twitter','instagram','facebook'].includes(provider||'');return <Link key={item.id} href={`/evidence/${item.slug}`} className="ev-mobile-card"><div className="relative aspect-[4/3] overflow-hidden bg-black">{playable?<AutoplayMedia mediaUrl={item.mediaUrl||item.sourceUrl} thumbnail={item.image} alt={item.title} imgClassName="h-full w-full object-cover"/>:item.image?<img src={item.image} alt={item.title} className="h-full w-full object-cover"/>:<MediaFallback className="h-full w-full object-cover"/>}<div className="absolute left-4 top-4 rounded-full bg-[var(--paper)]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ink)]">{item.type}</div></div><div className="p-5"><div className="mb-3 flex justify-between gap-3 text-[10px] uppercase tracking-widest text-[var(--muted)]"><span>{item.year} · {item.location}</span><span className="inline-flex items-center gap-1">{icon(item.verification)} {item.verification}</span></div><h3 className="editorial-serif text-2xl leading-tight">{item.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{item.description}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-bold">View evidence <ArrowUpRight size={14}/></span></div></Link>})}
  </div>
 </>;
}
