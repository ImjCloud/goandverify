'use client';

import {useEffect, useState} from 'react';
import {ArrowLeft, ArrowRight, ExternalLink, Pause, Play} from 'lucide-react';
import type {ApprovedAd} from '@/lib/ads';

export function AdvertCarousel({ads}: {ads: ApprovedAd[]}) {
  const visibleAds = ads.slice(0, 30);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = visibleAds[index] ?? visibleAds[0];

  useEffect(() => {
    if (paused || visibleAds.length < 2) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % visibleAds.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, visibleAds.length]);

  useEffect(() => {
    if (!current) return;
    void fetch('/api/ads/events', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({adId: current.id, eventType: 'impression'})});
  }, [current?.id]);

  if (!current) return null;
  const previous = () => setIndex(value => (value - 1 + visibleAds.length) % visibleAds.length);
  const next = () => setIndex(value => (value + 1) % visibleAds.length);

  return (
    <section className="ad-banner border-y border-white/10 px-5 py-8" aria-label="Community adverts" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[var(--accent)]">Featured community adverts</p>
          <p className="text-xs text-[var(--muted)]" aria-live="polite">{index + 1} of {visibleAds.length}</p>
        </div>
        <a href={current.target_url} target="_blank" rel="noreferrer" onClick={() => {const body=JSON.stringify({adId: current.id, eventType: 'click'}); if (navigator.sendBeacon) {navigator.sendBeacon('/api/ads/events', new Blob([body], {type: 'application/json'}));} else {void fetch('/api/ads/events', {method: 'POST', headers: {'Content-Type': 'application/json'}, body, keepalive: true});}}} className="ad-flashcard group block overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-2)]">
          {current.media_type === 'video' && current.media_url ? <video src={current.media_url} poster={current.image_url ?? undefined} muted autoPlay loop playsInline className="max-h-[360px] w-full bg-black object-cover" /> : (current.media_url || current.image_url) ? <img src={current.media_url || current.image_url || ''} alt="" className="max-h-[360px] w-full object-cover" /> : <div className="flex min-h-48 items-center justify-center bg-[var(--surface)] px-6 text-center"><div><ExternalLink className="mx-auto text-[var(--accent)]" size={28}/><p className="mt-3 text-sm font-bold">Open this featured link</p></div></div>}
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-7"><div><h2 className="editorial-serif text-3xl md:text-4xl">{current.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{current.description}</p><p className="mt-3 text-xs font-bold text-[var(--accent)]">{current.advertiser_name}</p></div><span className="inline-flex shrink-0 items-center gap-2 text-xs font-bold">Visit advert <ExternalLink size={14}/></span></div>
        </a>
        {visibleAds.length > 1 && <div className="mt-4 flex items-center justify-between"><div className="flex gap-1.5" aria-label="Choose advert"><span className="sr-only">Choose advert</span>{visibleAds.map((ad, adIndex) => <button key={ad.id} aria-label={`Show advert ${adIndex + 1}`} aria-current={adIndex === index} onClick={() => setIndex(adIndex)} className={`ad-dot ${adIndex === index ? 'is-active' : ''}`} />)}</div><div className="flex items-center gap-2"><button onClick={previous} aria-label="Previous advert" className="ad-control"><ArrowLeft size={16}/></button><button onClick={() => setPaused(value => !value)} aria-label={paused ? 'Play adverts' : 'Pause adverts'} className="ad-control">{paused ? <Play size={16}/> : <Pause size={16}/>}</button><button onClick={next} aria-label="Next advert" className="ad-control"><ArrowRight size={16}/></button></div></div>}
      </div>
    </section>
  );
}