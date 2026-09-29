'use client';

import {useEffect,useMemo,useState} from 'react';
import type {MouseEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,CheckCircle2,AlertTriangle,Clock3,Archive,Camera} from 'lucide-react';
import Link from 'next/link';
import {getEmbed} from '@/lib/embed';
import type {Evidence} from '@/lib/data';
import type {CampaignEvent} from '@/lib/campaignEvents';
import {AutoplayMedia} from '@/components/AutoplayMedia';
import {MediaFallback} from '@/components/MediaFallback';

const PAGE_SIZE=8;
type DisplayItem={kind:'evidence';item:Evidence}|{kind:'campaign';item:CampaignEvent};

const icon=(value:Evidence['verification'])=>{
  if(value==='Source Verified'||value==='Partially Verified')return <CheckCircle2 size={13}/>;
  if(value==='Disputed')return <AlertTriangle size={13}/>;
  if(value==='Archived')return <Archive size={13}/>;
  return <Clock3 size={13}/>;
};
const VIDEO_PROVIDERS=['youtube','vimeo','tiktok','twitter','instagram','facebook','threads'];

function CampaignMedia({item,className,eager=false}:{item:CampaignEvent;className:string;eager?:boolean}){
  if(item.media_type==='video'&&item.media_url){
    return <AutoplayMedia mediaUrl={item.media_url} mediaType="video" thumbnail={item.image_url} alt={item.title} imgClassName={className} eager={eager}/>;
  }
  if(item.image_url)return <img src={item.image_url} alt={item.title} className={className}/>;
  return <MediaFallback className={className}/>;
}

export function EvidenceCarousel({items,campaignItems=[]}:{items:Evidence[];campaignItems?:CampaignEvent[]}){
  const [page,setPage]=useState(0);
  const [active,setActive]=useState<number|null>(null);
  const [edgeLock,setEdgeLock]=useState(false);
  const [direction,setDirection]=useState<'next'|'prev'>('next');
  const merged=useMemo<DisplayItem[]>(()=>[
    ...items.map(item=>({kind:'evidence' as const,item})),
    ...campaignItems.map(item=>({kind:'campaign' as const,item}))
  ],[items,campaignItems]);
  const pageCount=Math.max(1,Math.ceil(merged.length/PAGE_SIZE));
  const visible=merged.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);

  useEffect(()=>{if(page>=pageCount)setPage(0)},[page,pageCount]);
  useEffect(()=>{setActive(null);setEdgeLock(false)},[page]);

  const changePage=(dir:'next'|'prev')=>{
    if(edgeLock||pageCount<2)return;
    setDirection(dir);setEdgeLock(true);
    setPage(current=>(current+(dir==='next'?1:-1)+pageCount)%pageCount);
    window.setTimeout(()=>setEdgeLock(false),750);
  };
  const handleMove=(event:MouseEvent<HTMLDivElement>)=>{
    if(active!==visible.length-1||pageCount<2||edgeLock)return;
    const bounds=event.currentTarget.getBoundingClientRect();
    if(event.clientX-bounds.left>bounds.width*.82)changePage('next');
  };

  const renderMedia=(entry:DisplayItem,mobile=false)=>{
    const className=mobile?'h-full w-full object-cover':'ev-panel-img';
    if(entry.kind==='campaign')return <CampaignMedia item={entry.item} className={className}/>;
    const item=entry.item;
    const provider=getEmbed(item.mediaUrl||item.sourceUrl)?.provider;
    const playable=item.type==='video'||VIDEO_PROVIDERS.includes(provider||'');
    if(playable)return <AutoplayMedia mediaUrl={item.mediaUrl||item.sourceUrl} mediaType={item.type} thumbnail={item.image} alt={item.title} imgClassName={className}/>;
    if(item.type==='image'&&item.mediaUrl)return <AutoplayMedia mediaUrl={item.mediaUrl} mediaType="image" thumbnail={item.image} alt={item.title} imgClassName={className}/>;
    if(item.image)return <img src={item.image} alt={item.title} className={className}/>;
    return <MediaFallback className={className}/>;
  };

  return <>
    <div className="hidden md:block" onMouseMove={handleMove}>
      <div className="relative">
        <div key={page} className={`ev-rail ev-set-${direction}`} onMouseLeave={()=>setActive(null)}>
          {visible.map((entry,index)=>{
            const isActive=index===active;
            const isCampaign=entry.kind==='campaign';
            const item=entry.item;
            const href=isCampaign
              ? `/campaign/${entry.item.id}`
              : `/evidence/${entry.item.slug}`;
            const title=entry.item.title;
            const description=entry.item.description||'Approved campaign upload.';
            const location=isCampaign
              ? (entry.item.location||'Campaign')
              : (entry.item.location||'Location unspecified');
            const yearOrDate=isCampaign
              ? (entry.item.event_date||'Recent')
              : entry.item.year;
            const verificationLabel=isCampaign
              ? 'Campaign upload'
              : entry.item.verification;
            const sourceLabel=isCampaign
              ? 'Community campaign upload'
              : entry.item.author;
            const sourceDetail=isCampaign
              ? 'Approved campaign media'
              : `Source: ${entry.item.source}`;
            return <Link key={`${entry.kind}-${item.id}`} href={href} className={`ev-panel ${isActive?'is-active':''}`} aria-label={`View ${isCampaign?'campaign upload':'evidence'}: ${title}`} style={{flexGrow:active===null?1:isActive?7:.55}} onMouseEnter={()=>setActive(index)} onFocus={()=>setActive(index)} tabIndex={0}>
              <div className="ev-panel-media">
                {renderMedia(entry)}
                <span className="ev-panel-type">{isCampaign?'Campaign':item.type}</span>
                {!isActive&&<span className="ev-panel-vertical editorial-serif">{title}</span>}
              </div>
              <div className="ev-panel-summary">
                <div className="ev-panel-meta">
                  <span>{yearOrDate} · {location}</span>
                  <span className="inline-flex items-center gap-1">{isCampaign?<><Camera size={13}/>{verificationLabel}</>:<>{icon(item.verification)} {verificationLabel}</>}</span>
                </div>
                <h3 className="editorial-serif ev-panel-title">{title}</h3>
                <p className="ev-panel-desc">{description}</p>
                <div className="ev-panel-source"><span>{sourceLabel}</span><span className="font-semibold">{sourceDetail}</span></div>
                <span className="ev-panel-cta">View {isCampaign?'campaign media':'evidence'} <ArrowUpRight size={14}/></span>
              </div>
            </Link>;
          })}
        </div>
        {pageCount>1&&<button type="button" aria-label="Show more evidence" onClick={()=>changePage('next')} className="ev-more-arrow" title="More evidence"><ArrowRight size={22}/><span>More</span></button>}
        {pageCount>1&&<button type="button" aria-label="Show previous evidence" onClick={()=>changePage('prev')} className="ev-prev-arrow" title="Previous evidence"><ArrowLeft size={20}/></button>}
      </div>
      {pageCount>1&&<div className="mt-4 flex items-center justify-between gap-4 text-xs text-[var(--muted)]"><span>Set {page+1} of {pageCount} · Evidence and approved campaign uploads</span><button type="button" onClick={()=>changePage('next')} className="inline-flex items-center gap-1 font-bold text-[var(--accent)]">Next set <ArrowRight size={14}/></button></div>}
    </div>

    <div className="ev-mobile-rail flex md:hidden">
      {visible.map(entry=>{
        const item=entry.item;
        const isCampaign=entry.kind==='campaign';
        const href=isCampaign
          ? `/campaign/${entry.item.id}`
          : `/evidence/${entry.item.slug}`;
        const mobileYear=isCampaign
          ? (entry.item.event_date||'Recent')
          : entry.item.year;
        const mobileLocation=isCampaign
          ? (entry.item.location||'Campaign')
          : (entry.item.location||'');
        const mobileStatus=isCampaign
          ? 'Campaign'
          : entry.item.verification;
        return <Link key={`${entry.kind}-${item.id}`} href={href} className="ev-mobile-card">
          <div className="relative aspect-[4/3] overflow-hidden bg-black">{renderMedia(entry,true)}<div className="absolute left-4 top-4 rounded-full bg-[var(--paper)]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ink)]">{isCampaign?'Campaign':item.type}</div></div>
          <div className="p-5"><div className="mb-3 flex justify-between gap-3 text-[10px] uppercase tracking-widest text-[var(--muted)]"><span>{mobileYear} · {mobileLocation}</span><span>{mobileStatus}</span></div><h3 className="editorial-serif text-2xl leading-tight">{item.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{item.description||'Approved campaign upload.'}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-bold">View {isCampaign?'campaign media':'evidence'} <ArrowUpRight size={14}/></span></div>
        </Link>;
      })}
    </div>
  </>;
}
