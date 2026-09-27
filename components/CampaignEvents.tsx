import Link from 'next/link';
import {CalendarDays, MapPin, ArrowUpRight, Camera} from 'lucide-react';
import type {CampaignEvent} from '@/lib/campaignEvents';
import {AutoplayMedia} from '@/components/AutoplayMedia';
import {MediaFallback} from '@/components/MediaFallback';

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-NG', {day: 'numeric', month: 'short', year: 'numeric'});
}

export function CampaignEvents({events}: {events: CampaignEvent[]}) {
  if (events.length === 0) return null;
  return (
    <section className="border-y border-white/10 bg-[var(--surface)] px-5 py-16" aria-label="What's New">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3">
          <Camera className="text-[var(--accent)]" size={18} />
          <p className="eyebrow text-[var(--accent)]">What's New</p>
        </div>
        <h2 className="editorial-serif mt-3 text-4xl md:text-5xl">Recent campaign activity.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Images and videos uploaded through the campaign upload portal.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(event => {
            const card = (
              <div className="group card-lift h-full overflow-hidden rounded-xl border border-white/10 bg-[var(--surface-2)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-black">
                  {event.media_type === 'video' && event.media_url ? (
                    <AutoplayMedia mediaUrl={event.media_url} thumbnail={event.image_url} alt={event.title} imgClassName="h-full w-full object-cover" />
                  ) : (
                    <img src={event.media_url || event.image_url || ''} alt={event.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">
                    {event.event_date && <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{formatDate(event.event_date)}</span>}
                    {event.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{event.location}</span>}
                  </div>
                  <h3 className="editorial-serif mt-2 text-xl leading-tight">{event.title}</h3>
                  {event.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{event.description}</p>}
                  {event.href && <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)]">Details <ArrowUpRight size={14} /></span>}
                </div>
              </div>
            );
            return event.href ? (
              <Link key={event.id} href={event.href} target={event.href.startsWith('http') ? '_blank' : undefined} rel={event.href.startsWith('http') ? 'noreferrer' : undefined}>{card}</Link>
            ) : (
              <div key={event.id}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
