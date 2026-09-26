import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowRight, ShieldCheck} from 'lucide-react';
import {people} from '@/lib/data';
import type {TimelineEntry} from '@/lib/data';

export const metadata: Metadata = {
  title: 'Timeline — Public Record',
  description: 'A dated, sourced chronology of public milestones for the 2027 ticket.',
};

type Row = TimelineEntry & {personName: string; personSlug: string};

function sortKey(year: string): number {
  const match = year.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 0;
}

export default function TimelinePage() {
  const rows: Row[] = people
    .flatMap(p => p.timeline.map(t => ({...t, personName: p.name, personSlug: p.slug})))
    .sort((a, b) => sortKey(a.year) - sortKey(b.year));

  return (
    <main className="mx-auto max-w-5xl px-5 py-20">
      <p className="eyebrow">Context</p>
      <h1 className="editorial-serif mt-3 text-6xl md:text-8xl">The full timeline.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
        Every dated milestone below is attributed to a source where one is available. Entries without a visible source are still pending verification.
      </p>

      <div className="relative mt-16 border-l border-white/10 pl-8 md:pl-12">
        {rows.map((row, i) => (
          <div key={i} className="relative pb-14 last:pb-0">
            <span className="absolute -left-[41px] top-1 h-3 w-3 rounded-full bg-[var(--accent)] md:-left-[57px]" />
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--accent)]">{row.year}</p>
            <h2 className="editorial-serif mt-2 text-3xl md:text-4xl">{row.title}</h2>
            <Link href={`/people/${row.personSlug}`} className="mt-1 inline-block text-xs font-semibold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)]">
              {row.personName}
            </Link>
            <p className="mt-4 max-w-2xl leading-7 text-[var(--ink)]/85">{row.text}</p>
            {row.source ? (
              <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)]">
                Source: {row.source} <ArrowRight size={12} />
              </a>
            ) : (
              <p className="mt-4 text-xs text-[var(--muted)]">Source pending verification.</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-8 text-xs text-[var(--muted)]">
        <ShieldCheck size={16} /> Have a correction or an additional dated source for one of these entries?{' '}
        <Link href="/submit" className="font-semibold text-[var(--accent)]">
          Submit it for review
        </Link>
        .
      </div>
    </main>
  );
}
