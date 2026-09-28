'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, Check, Clock3, ExternalLink, FileVideo, Loader2, Search, X} from 'lucide-react';

type CampaignSubmission = {
  id: string;
  title: string;
  description: string;
  location: string;
  event_date: string | null;
  source_url: string | null;
  uploader_name: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  media_url: string | null;
  media_path: string | null;
  status: 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'needs_more_information';
  event_category: 'campaign_activity' | 'historical_event' | null;
  created_at: string;
};

const statusLabel: Record<CampaignSubmission['status'], string> = {
  pending_review: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_more_information: 'Needs More Information',
};

export default function CampaignReview() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<CampaignSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/submissions?category=campaign_activity', {cache: 'no-store'});
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Could not load campaign submissions.');
      setAuthed(true);
      setRows(data.submissions ?? []);
    } catch (e: any) {
      setError(e?.message || 'Could not load campaign submissions.');
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function review(id: string, status: 'approved' | 'rejected' | 'needs_more_information') {
    const message = status === 'approved'
      ? 'Approve this campaign submission? It will become eligible for the public What’s New carousel.'
      : status === 'rejected'
        ? 'Reject this campaign submission? It will not be published.'
        : 'Return this campaign submission for more information?';
    if (!window.confirm(message)) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status, verification: status === 'approved' ? 'User Submitted' : 'Under Review'}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update this submission.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not update this submission.');
    } finally {
      setBusy(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(row => {
      const statusMatch = filter === 'all' || row.status === 'pending_review' || row.status === 'under_review' || row.status === 'needs_more_information';
      const textMatch = !q || `${row.title} ${row.description} ${row.location} ${row.uploader_name ?? ''}`.toLowerCase().includes(q);
      return statusMatch && textMatch;
    });
  }, [rows, query, filter]);

  const pendingCount = rows.filter(row => ['pending_review', 'under_review', 'needs_more_information'].includes(row.status)).length;
  const approvedCount = rows.filter(row => row.status === 'approved').length;
  const rejectedCount = rows.filter(row => row.status === 'rejected').length;

  if (authed === false && !loading) {
    return (
      <main className="mx-auto max-w-xl px-5 py-28 text-center">
        <Clock3 className="mx-auto" size={30} />
        <h1 className="editorial-serif mt-5 text-5xl">Moderator access required.</h1>
        <p className="mt-4 text-[var(--muted)]">Sign in through the admin console before opening Campaign Review.</p>
        <Link href="/admin" className="mt-8 inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[#15130f]">Open admin</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-7">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--ink)]"><ArrowLeft size={14}/> Admin console</Link>
          <p className="eyebrow mt-5">Campaign moderation</p>
          <h1 className="editorial-serif mt-2 text-5xl md:text-7xl">Campaign Review</h1>
          <p className="mt-4 max-w-2xl text-[var(--muted)]">Review community-submitted campaign activity before it can appear in What’s New. Only approved submissions are published to the public campaign carousel.</p>
        </div>
        <Link href="/submit?type=campaign" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-widest">Open public submission <ExternalLink size={14}/></Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ['Pending review', pendingCount, 'Awaiting moderator decision'],
          ['Approved', approvedCount, 'Eligible for What’s New'],
          ['Rejected', rejectedCount, 'Not publicly published'],
        ].map(([label, value, hint]) => (
          <div key={String(label)} className="border border-white/10 bg-[var(--surface)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
            <p className="editorial-serif mt-2 text-4xl">{value}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <div className="flex min-w-[260px] flex-1 items-center gap-2 border border-white/10 bg-[var(--surface)] px-4 py-3"><Search size={16} className="text-[var(--muted)]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search campaign submissions…" className="w-full bg-transparent text-sm outline-none" /></div>
        <button type="button" onClick={() => setFilter('pending')} className={`rounded-full px-5 py-3 text-xs font-bold uppercase tracking-widest ${filter === 'pending' ? 'bg-[var(--accent)] text-[#15130f]' : 'border border-white/15'}`}>Needs decision</button>
        <button type="button" onClick={() => setFilter('all')} className={`rounded-full px-5 py-3 text-xs font-bold uppercase tracking-widest ${filter === 'all' ? 'bg-[var(--accent)] text-[#15130f]' : 'border border-white/15'}`}>All campaign submissions</button>
      </div>

      {error && <div className="mt-6 border border-red-900/50 bg-red-950/40 px-5 py-4 text-sm text-red-300">{error}</div>}
      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={28}/></div> : filtered.length === 0 ? <div className="mt-8 border border-white/10 p-10 text-center text-[var(--muted)]">No campaign submissions match this view.</div> : (
        <div className="mt-8 grid gap-6">
          {filtered.map(row => {
            const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(row.media_url ?? '') || (!!row.media_path && row.thumbnailUrl !== row.mediaUrl);
            return (
              <article key={row.id} className="overflow-hidden border border-white/10 bg-[var(--surface)]">
                <div className="grid lg:grid-cols-[minmax(280px,420px)_1fr]">
                  <div className="relative aspect-[4/3] bg-black lg:aspect-auto lg:min-h-[300px]">
                    {row.thumbnailUrl ? <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover"/> : row.mediaUrl && isVideo ? <video src={row.mediaUrl} controls muted playsInline className="h-full w-full object-cover"/> : row.mediaUrl ? <img src={row.mediaUrl} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-[var(--muted)]">No media preview</div>}
                    <span className="absolute left-4 top-4 rounded-full bg-[var(--paper)]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ink)]"><FileVideo size={12} className="mr-1 inline"/> Campaign activity</span>
                  </div>
                  <div className="p-6 md:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">{statusLabel[row.status]}</span>
                      <span className="text-xs text-[var(--muted)]">{new Date(row.created_at).toLocaleString('en-NG')}</span>
                    </div>
                    <h2 className="editorial-serif mt-5 text-3xl">{row.title}</h2>
                    <p className="mt-3 leading-7 text-[var(--muted)]">{row.description}</p>
                    <div className="mt-5 grid gap-2 text-xs text-[var(--muted)] md:grid-cols-2">
                      <span><strong className="text-[var(--ink)]">Location:</strong> {row.location}</span>
                      <span><strong className="text-[var(--ink)]">Date:</strong> {row.event_date || 'Not supplied'}</span>
                      <span><strong className="text-[var(--ink)]">Submitted by:</strong> {row.uploader_name || 'Anonymous contributor'}</span>
                      <span><strong className="text-[var(--ink)]">Source:</strong> {row.source_url ? <a href={row.source_url} target="_blank" rel="noreferrer" className="underline">Open source</a> : 'Not supplied'}</span>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-3">
                      {(row.status === 'pending_review' || row.status === 'under_review' || row.status === 'needs_more_information') && <>
                        <button disabled={busy === row.id} onClick={() => review(row.id, 'approved')} className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-xs font-bold uppercase tracking-widest text-[#15130f]"><Check size={15}/> {busy === row.id ? 'Working…' : 'Approve & publish'}</button>
                        <button disabled={busy === row.id} onClick={() => review(row.id, 'needs_more_information')} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-widest"><Clock3 size={15}/> Needs info</button>
                        <button disabled={busy === row.id} onClick={() => review(row.id, 'rejected')} className="inline-flex items-center gap-2 rounded-full border border-red-900/60 px-5 py-3 text-xs font-bold uppercase tracking-widest text-red-300"><X size={15}/> Reject</button>
                      </>}
                      {row.mediaUrl && <a href={row.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-widest">Open submitted media <ExternalLink size={14}/></a>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
