import Link from 'next/link';
import {ArrowUpRight, Megaphone} from 'lucide-react';
import type {ApprovedAd} from '@/lib/ads';
import {AdvertCarousel} from '@/components/AdvertCarousel';

export function AdvertiseBanner({ads = []}: {ads?: ApprovedAd[]}) {
  if (ads.length > 0) {
    return <AdvertCarousel ads={ads}/>;
  }
  return (
    <section className="ad-banner border-y border-white/10 px-5 py-10" aria-label="Advertising opportunities">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-start gap-4">
          <span className="ad-icon" aria-hidden="true"><Megaphone size={20} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[var(--accent)]">Partner with Public Record</p>
            <h2 className="editorial-serif mt-2 text-3xl md:text-4xl">Put your work in front of curious people.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Promote a civic project, event, publication, service or community initiative in a space built around public interest.</p>
          </div>
        </div>
        <Link href="/contact" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-bold text-[#15130f]">Advertise here <ArrowUpRight size={16} /></Link>
      </div>
    </section>
  );
}