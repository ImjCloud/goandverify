'use client';
import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, CalendarDays, Camera, MapPin, Pause, Play} from 'lucide-react';
import type {CampaignEvent} from '@/lib/campaignEvents';
import {AutoplayMedia} from '@/components/AutoplayMedia';
import {MediaFallback} from '@/components/MediaFallback';

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-NG', {day: 'numeric', month: 'short', year: 'numeric'});
}

export function CampaignCarousel({events}: {events: CampaignEvent[]}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const mobileRail = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (events.length < 2 || paused) return;
    const timer = window.setInterval(() => setActive(current => (current + 1) % events.length), 5200);
    return () => window.clearInterval(timer);
  }, [events.length, paused]);

  useEffect(() => {
    if (!mobileRail.current || events.length < 2) return;
    const cards = mobileRail.current.querySelectorAll<HTMLElement>('[data-campaign-card]');
    const target = cards[active];
    if (!target) return;
    mobileRail.current.scrollTo({left: target.offsetLeft - 12, behavior: 'smooth'});
  }, [active, events.length]);

  if (events.length === 0) {
    return (
      <div className="wn-empty">
        <Camera size={18} />
        <div>
          <p className="editorial-serif text-2xl">No campaign updates yet.</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Publish the first approved campaign photo or video from the upload portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wn-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="wn-rail">
        {events.map((item, i) => {
          const isActive = i === active;
          const media = item.media_type === 'video'
            ? <AutoplayMedia mediaUrl={item.media_url} thumbnail={item.image_url} alt={item.title} imgClassName="wn-img" />
            : item.image_url
              ? <img src={item.image_url} alt={item.title} className="wn-img" />
              : <MediaFallback className="wn-img" />;

          return (
            <article key={item.id} data-campaign-card className={`wn-card ${isActive ? 'is-active' : ''}`} style={{flexGrow: isActive ? 7 : 0.55}} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} tabIndex={0} aria-label={`Campaign update: ${item.title}`}>
              <div className="wn-media">
                {media}
                <span className="wn-type">{item.media_type === 'video' ? 'Video' : 'Update'}</span>
                {!isActive && <span className="wn-vertical editorial-serif">{item.title}</span>}
              </div>
              <div className="wn-summary">
                <div className="wn-meta">
                  <span className="inline-flex items-center gap-1">{item.event_date && <><CalendarDays size={12}/>{formatDate(item.event_date)}</>}</span>
                  {item.location && <span className="inline-flex items-center gap-1"><MapPin size={12}/>{item.location}</span>}
                </div>
                <h3 className="editorial-serif wn-title">{item.title}</h3>
                {item.description && <p className="wn-desc">{item.description}</p>}
                <div className="wn-source"><span>Campaign update</span>{item.href ? <Link href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined} className="inline-flex items-center gap-1 font-semibold text-[var(--accent)]">Details <ArrowUpRight size={14}/></Link> : <span className="text-[var(--muted)]">Published</span>}</div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="wn-mobile-rail" ref={mobileRail}>
        {events.map((item, i) => (
          <article key={item.id} data-campaign-card className={`wn-mobile-card ${i === active ? 'is-active' : ''}`} onClick={() => setActive(i)}>
            <div className="relative aspect-[4/3] overflow-hidden bg-black">
              {item.media_type === 'video'
                ? <AutoplayMedia mediaUrl={item.media_url} thumbnail={item.image_url} alt={item.title} imgClassName="h-full w-full object-cover" />
                : item.image_url
                  ? <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                  : <MediaFallback className="h-full w-full object-cover" />}
              <div className="absolute left-4 top-4 rounded-full bg-[var(--paper)]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ink)]">{item.media_type === 'video' ? 'Video' : 'Update'}</div>
            </div>
            <div className="p-5">
              <div className="mb-3 flex justify-between gap-3 text-[10px] uppercase tracking-widest text-[var(--muted)]"><span>{item.event_date ? formatDate(item.event_date) : 'Recent'}</span><span>{i + 1} / {events.length}</span></div>
              <h3 className="editorial-serif text-2xl leading-tight">{item.title}</h3>
              {item.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{item.description}</p>}
              {item.href && <Link href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined} className="mt-5 inline-flex items-center gap-1 text-xs font-bold">Details <ArrowUpRight size={14}/></Link>}
            </div>
          </article>
        ))}
      </div>

      <div className="wn-controls">
        <div className="wn-dots" aria-label="Campaign carousel controls">{events.map((item, i) => <button key={item.id} type="button" aria-label={`Show campaign update ${i + 1}`} aria-pressed={i === active} className={`wn-dot ${i === active ? 'is-active' : ''}`} onClick={() => setActive(i)} />)}</div>
        <button type="button" className="wn-play" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume campaign carousel' : 'Pause campaign carousel'}>{paused ? <Play size={13}/> : <Pause size={13}/>} {paused ? 'Resume' : 'Pause'}</button>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">Auto-advances every 5.2 seconds. Videos play muted when their card is sufficiently visible and pause when it leaves the viewport.</p>
    </div>
  );
}
