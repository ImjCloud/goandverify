import Link from 'next/link';
import {ArrowUpRight, Sparkles} from 'lucide-react';
import type {ActivityEvent} from '@/lib/activity';

export function WhatsNew({events}: {events: ActivityEvent[]}) {
  if (events.length === 0) return null;
  const latest = events[0];
  const Wrapper = latest.href ? Link : 'div';
  return (
    <section className="border-y border-white/10 bg-[var(--surface)] px-5 py-4" aria-label="What's new">
      <Wrapper href={latest.href ?? undefined as any} className="mx-auto flex max-w-7xl items-center gap-3 text-sm">
        <Sparkles className="shrink-0 text-[var(--accent)]" size={16} />
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--accent)]">What&apos;s new</span>
        <span className="truncate font-semibold">{latest.title}</span>
        {latest.href && <ArrowUpRight size={14} className="ml-auto shrink-0" />}
      </Wrapper>
    </section>
  );
}
