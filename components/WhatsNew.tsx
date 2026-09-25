import Link from 'next/link';
import {ArrowUpRight, Sparkles} from 'lucide-react';
import type {ActivityEvent} from '@/lib/activity';

export function WhatsNew({events}: {events: ActivityEvent[]}) {
  if (events.length === 0) return null;
  return <section className="border-y border-white/10 bg-[var(--surface)] px-5 py-12" aria-label="What's new"><div className="mx-auto max-w-7xl"><div className="flex items-center gap-3"><Sparkles className="text-[var(--accent)]" size={18}/><p className="eyebrow text-[var(--accent)]">What&apos;s new</p></div><div className="mt-6 grid gap-4 md:grid-cols-3">{events.map(event => <div key={event.id} className="rounded-xl border border-white/10 bg-[var(--surface-2)] p-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">{event.event_type.replace('_', ' ')}</p><h2 className="editorial-serif mt-2 text-2xl">{event.title}</h2>{event.description && <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{event.description}</p>}{event.href && <Link href={event.href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold">Explore <ArrowUpRight size={14}/></Link>}</div>)}</div></div></section>;
}
