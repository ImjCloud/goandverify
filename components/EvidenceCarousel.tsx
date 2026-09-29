'use client';

import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, AlertTriangle, Clock3, Archive } from 'lucide-react';
import Link from 'next/link';
import { getEmbed } from '@/lib/embed';
import type { Evidence } from '@/lib/data';
import { AutoplayMedia } from '@/components/AutoplayMedia';
import { MediaFallback } from '@/components/MediaFallback';

const PAGE_SIZE = 8;

const icon = (value: Evidence['verification']) => {
  if (value === 'Source Verified' || value === 'Partially Verified') return <CheckCircle2 size={13} />;
  if (value === 'Disputed') return <AlertTriangle size={13} />;
  if (value === 'Archived') return <Archive size={13} />;
  return <Clock3 size={13} />;
};

const VIDEO_PROVIDERS = ['youtube', 'vimeo', 'tiktok', 'twitter', 'instagram', 'facebook', 'threads'];

export function EvidenceCarousel({ items }: { items: Evidence[] }) {
  const [page, setPage] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [edgeLock, setEdgeLock] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visible = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    if (page >= pageCount) setPage(0);
  }, [page, pageCount]);

  useEffect(() => {
    setActive(null);
    setEdgeLock(false);
  }, [page]);

  const changePage = (dir: 'next' | 'prev') => {
    if (edgeLock || pageCount < 2) return;
    setDirection(dir);
    setEdgeLock(true);
    setPage((current) => (current + (dir === 'next' ? 1 : -1) + pageCount) % pageCount);
    window.setTimeout(() => setEdgeLock(false), 750);
  };

  const nextPage = () => changePage('next');
  const prevPage = () => changePage('prev');

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    if (active !== visible.length - 1 || pageCount < 2 || edgeLock) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX - bounds.left > bounds.width * 0.82) nextPage();
  };

  const renderMedia = (item: Evidence, mobile = false) => {
    const provider = getEmbed(item.mediaUrl || item.sourceUrl)?.provider;
    const playable = item.type === 'video' || VIDEO_PROVIDERS.includes(provider || '');
    const className = mobile ? 'h-full w-full object-cover' : 'ev-panel-img';

    if (playable) {
      return (
        <AutoplayMedia
          mediaUrl={item.mediaUrl || item.sourceUrl}
          mediaType={item.type}
          thumbnail={item.image}
          alt={item.title}
          imgClassName={className}
        />
      );
    }

    if (item.image) return <img src={item.image} alt={item.title} className={className} />;
    return <MediaFallback className={className} />;
  };

  return (
    <>
      <div className="hidden md:block" onMouseMove={handleMove}>
        <div className="relative">
          <div key={page} className={`ev-rail ev-set-${direction}`} onMouseLeave={() => setActive(null)}>
            {visible.map((item, index) => {
              const isActive = index === active;
              return (
                <Link key={item.id} href={`/evidence/${item.slug}`} className={`ev-panel ${isActive ? 'is-active' : ''}`} aria-label={`View evidence: ${item.title}`} style={{ flexGrow: active === null ? 1 : isActive ? 7 : 0.55 }} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} tabIndex={0}>
                  <div className="ev-panel-media">
                    {renderMedia(item)}
                    <span className="ev-panel-type">{item.type}</span>
                    {!isActive && <span className="ev-panel-vertical editorial-serif">{item.title}</span>}
                  </div>
                  <div className="ev-panel-summary">
                    <div className="ev-panel-meta">
                      <span>{item.year} · {item.location}</span>
                      <span className="inline-flex items-center gap-1">{icon(item.verification)} {item.verification}</span>
                    </div>
                    <h3 className="editorial-serif ev-panel-title">{item.title}</h3>
                    <p className="ev-panel-desc">{item.description}</p>
                    <div className="ev-panel-source"><span>{item.author}</span><span className="font-semibold">Source: {item.source}</span></div>
                    <span className="ev-panel-cta">View evidence <ArrowUpRight size={14} /></span>
                  </div>
                </Link>
              );
            })}
          </div>

          {pageCount > 1 && <button type="button" aria-label="Show more evidence" onClick={nextPage} className="ev-more-arrow" title="More evidence"><ArrowRight size={22} /><span>More</span></button>}
          {pageCount > 1 && <button type="button" aria-label="Show previous evidence" onClick={prevPage} className="ev-prev-arrow" title="Previous evidence"><ArrowLeft size={20} /></button>}
        </div>

        {pageCount > 1 && <div className="mt-4 flex items-center justify-between gap-4 text-xs text-[var(--muted)]"><span>Set {page + 1} of {pageCount} · Move to the right edge to load more evidence</span><button onClick={nextPage} className="inline-flex items-center gap-1 font-bold text-[var(--accent)]">Next set <ArrowRight size={14} /></button></div>}
      </div>

      <div className="ev-mobile-rail flex md:hidden">
        {visible.map((item) => (
          <Link key={item.id} href={`/evidence/${item.slug}`} className="ev-mobile-card">
            <div className="relative aspect-[4/3] overflow-hidden bg-black">
              {renderMedia(item, true)}
              <div className="absolute left-4 top-4 rounded-full bg-[var(--paper)]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ink)]">{item.type}</div>
            </div>
            <div className="p-5">
              <div className="mb-3 flex justify-between gap-3 text-[10px] uppercase tracking-widest text-[var(--muted)]"><span>{item.year} · {item.location}</span><span className="inline-flex items-center gap-1">{icon(item.verification)} {item.verification}</span></div>
              <h3 className="editorial-serif text-2xl leading-tight">{item.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold">View evidence <ArrowUpRight size={14} /></span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
