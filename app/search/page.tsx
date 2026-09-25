'use client';
import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {Search, Loader2} from 'lucide-react';
import type {Evidence} from '@/lib/data';
import {people} from '@/lib/data';
import {FollowForm} from '@/components/FollowForm';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [ep, setEp] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const needle = q.toLowerCase();
  const pp = people.filter(p => `${p.name} ${p.role} ${p.party}`.toLowerCase().includes(needle));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setEp([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setEp(Array.isArray(data.evidence) ? data.evidence : []);
      } catch {
        setEp([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-20">
      <p className="eyebrow">Search</p>
      <h1 className="editorial-serif mt-3 text-6xl md:text-8xl">Find a record.</h1>
      <div className="mt-8 max-w-2xl"><FollowForm /></div>
      <div className="mt-10 flex items-center gap-3 border border-white/15 bg-[var(--surface)] px-4">
        <Search size={20} aria-hidden="true" />
        <label htmlFor="site-search" className="sr-only">Search people and evidence</label>
        <input id="site-search" autoFocus value={q} onChange={e => setQ(e.target.value)} className="w-full py-4 outline-none" placeholder="People, evidence, locations, sources..." />
        {loading && <Loader2 size={18} className="animate-spin text-[var(--muted)]" />}
      </div>
      {q && (
        <div className="mt-12 grid gap-12 md:grid-cols-2" aria-live="polite">
          <section>
            <p className="eyebrow">People</p>
            {pp.map(p => (
              <Link key={p.slug} href={`/people/${p.slug}`} className="mt-4 block border-b border-white/10 py-5">
                <h2 className="editorial-serif text-3xl">{p.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{p.role} · {p.party}</p>
              </Link>
            ))}
            {pp.length === 0 && <p className="mt-4 text-sm text-[var(--muted)]">No matching people.</p>}
          </section>
          <section>
            <p className="eyebrow">Evidence</p>
            {ep.map(e => (
              <Link key={e.id} href={`/evidence/${e.slug}`} className="mt-4 block border-b border-white/10 py-5">
                <h2 className="editorial-serif text-3xl">{e.title}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{e.year} · {e.location} · {e.verification}</p>
              </Link>
            ))}
            {!loading && ep.length === 0 && <p className="mt-4 text-sm text-[var(--muted)]">No matching evidence.</p>}
          </section>
        </div>
      )}
      {!q && <p className="mt-8 text-sm text-[var(--muted)]">Search by person, location, source, or record title.</p>}
    </main>
  );
}
