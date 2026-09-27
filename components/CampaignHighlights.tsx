import Link from 'next/link';
import {Camera} from 'lucide-react';
import type {Evidence} from '@/lib/data';

const PERSON_LABEL: Record<string, string> = {
  'peter-obi': 'Peter Obi',
  'rabiu-kwankwaso': 'Rabiu Kwankwaso',
  both: 'Peter Obi & Kwankwaso',
};

export function CampaignHighlights({items}: {items: Evidence[]}) {
  if (items.length === 0) return null;
  return (
    <section className="border-y border-white/10 px-5 py-16" aria-label="Campaign highlights">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3">
          <Camera className="text-[var(--accent)]" size={18} />
          <p className="eyebrow text-[var(--accent)]">Campaign highlights</p>
        </div>
        <h2 className="editorial-serif mt-3 text-4xl md:text-5xl">Recent campaign activity.</h2>
        <div className="mt-8 flex gap-4 overflow-x-auto pb-2">
          {items.map(item => (
            <Link key={item.id} href={`/evidence/${item.slug}`} className="group relative aspect-[3/4] w-56 shrink-0 overflow-hidden rounded-lg bg-black">
              <img src={item.image ?? undefined} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4">
                {item.aboutPerson && <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">{PERSON_LABEL[item.aboutPerson] ?? item.aboutPerson}</p>}
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
