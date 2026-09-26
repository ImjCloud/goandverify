'use client';
import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {ShieldCheck, Search, Check, X, Clock3, FileText, Lock, Loader2, AlertTriangle, Link as LinkIcon, Flag} from 'lucide-react';

type Submission = {
  id: string;
  title: string;
  description: string;
  location: string;
  event_date: string | null;
  source_url: string | null;
  uploader_name: string | null;
  media_path: string | null;
  media_url: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  isLink: boolean;
  status: 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'needs_more_information';
  created_at: string;
};

const STATUS_LABEL: Record<Submission['status'], string> = {
  pending_review: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_more_information: 'Needs More Information',
};

const VERIFICATION_OPTIONS = ['User Submitted', 'Under Review', 'Partially Verified', 'Source Verified', 'Disputed', 'Archived'];

type FlagRow = {
  id: string;
  reason: string;
  details: string | null;
  reporter_email: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  evidence: {id: string; title: string; slug: string} | null;
};

type AdRequest = {
  id: string;
  advertiser_name: string;
  contact_email: string | null;
  contact_whatsapp: string | null;
  title: string;
  description: string;
  media_type: 'image' | 'video' | 'link';
  media_url: string | null;
  image_url: string | null;
  target_url: string;
  start_date: string | null;
  end_date: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  paused_at: string | null;
  created_at: string;
  analytics?: {impressions: number; clicks: number};
};

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState<'submissions' | 'flags' | 'adverts'>('submissions');
  const [rows, setRows] = useState<Submission[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagBusyId, setFlagBusyId] = useState<string | null>(null);
  const [ads, setAds] = useState<AdRequest[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adBusyId, setAdBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verificationChoice, setVerificationChoice] = useState<Record<string, string>>({});

  async function loadFlags() {
    setFlagsLoading(true);
    try {
      const res = await fetch('/api/admin/flags');
      const data = await res.json();
      if (res.ok) setFlags(data.flags ?? []);
    } catch {
      /* surfaced via empty state */
    } finally {
      setFlagsLoading(false);
    }
  }

  async function actOnFlag(id: string, status: 'resolved' | 'dismissed') {
    setFlagBusyId(id);
    try {
      await fetch(`/api/admin/flags/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status}),
      });
      await loadFlags();
    } finally {
      setFlagBusyId(null);
    }
  }

  async function loadAds() {
    setAdsLoading(true);
    try {
      const res = await fetch('/api/admin/ads');
      const data = await res.json();
      if (res.ok) setAds(data.ads ?? []);
    } finally {
      setAdsLoading(false);
    }
  }

  async function actOnAd(id: string, status: 'approved' | 'rejected') {
    setAdBusyId(id);
    try {
      const res = await fetch('/api/admin/ads', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, status})});
      if (res.ok) await loadAds();
    } finally {
      setAdBusyId(null);
    }
  }

  async function toggleAd(id: string, paused: boolean) {
    setAdBusyId(id);
    try {
      const res = await fetch('/api/admin/ads', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, action: paused ? 'resume' : 'pause'})});
      if (res.ok) await loadAds();
    } finally {
      setAdBusyId(null);
    }
  }

  async function loadSubmissions() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/submissions');
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned an unexpected response (status ${res.status}). Check your terminal for a compile error — a common cause is a new dependency (e.g. @supabase/supabase-js) not being installed yet. Try stopping the dev server and running "npm install" again.`);
      }
      if (!res.ok) throw new Error(data.error || 'Failed to load submissions.');
      setAuthed(true);
      setRows(data.submissions ?? []);
    } catch (e: any) {
      // Never leave the UI stuck on the spinner: fall back to the login
      // screen and surface the real error there instead of spinning forever.
      setAuthed(false);
      setLoadError(e?.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (tab === 'flags' && flags.length === 0) loadFlags();
    if (tab === 'adverts' && ads.length === 0) loadAds();
  }, [tab]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Incorrect password.');
      setPassword('');
      await loadSubmissions();
    } catch (e: any) {
      setLoginError(e.message || 'Incorrect password.');
    } finally {
      setLoggingIn(false);
    }
  }

  async function act(id: string, status: 'approved' | 'rejected' | 'needs_more_information') {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status, verification: verificationChoice[id] || 'User Submitted'}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Action failed.');
      await loadSubmissions();
    } catch (e: any) {
      setLoadError(e.message || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(
    () => rows.filter(r => `${r.title} ${r.location} ${r.uploader_name ?? ''}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );
  const counts = {
    pending: rows.filter(x => x.status === 'pending_review' || x.status === 'under_review').length,
    approved: rows.filter(x => x.status === 'approved').length,
    rejected: rows.filter(x => x.status === 'rejected').length,
  };

  if (authed === null) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center px-5 py-32 text-center">
        <Loader2 className="animate-spin" size={28} />
      </main>
    );
  }

  if (authed === false) {
    return (
      <main className="mx-auto max-w-md px-5 py-28">
        <div className="flex flex-col items-center text-center">
          <Lock size={28} />
          <h1 className="editorial-serif mt-5 text-4xl">Moderator access</h1>
          <p className="mt-3 text-[var(--muted)]">Enter the moderation password to review submissions.</p>
        </div>
        {loadError && (
          <p className="mt-6 flex items-start gap-2 border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-left text-sm text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {loadError}
          </p>
        )}
        <form onSubmit={handleLogin} className="mt-8 grid gap-4">
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="border border-white/15 bg-[var(--surface)] px-4 py-3"
          />
          {loginError && (
            <p className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle size={15} /> {loginError}
            </p>
          )}
          <button disabled={loggingIn} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[#15130f] disabled:opacity-60">
            {loggingIn && <Loader2 size={16} className="animate-spin" />}
            {loggingIn ? 'Checking…' : 'Enter console'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Moderation console</p>
          <h1 className="editorial-serif mt-3 text-5xl md:text-7xl">Evidence review.</h1>
          <p className="mt-4 max-w-2xl text-[var(--muted)]">Review provenance and metadata before material enters the public archive.</p>
        </div>
        <Link href="/evidence" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold">
          View public archive
        </Link>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        <Stat label="Pending review" value={counts.pending} icon={<Clock3 size={18} />} />
        <Stat label="Approved" value={counts.approved} icon={<Check size={18} />} />
        <Stat label="Rejected" value={counts.rejected} icon={<X size={18} />} />
        <Stat label="Open flags" value={flags.filter(f => f.status === 'open').length} icon={<Flag size={18} />} />
      </div>

      <div className="mt-10 inline-flex overflow-hidden rounded-full border border-white/15">
        <button onClick={() => setTab('submissions')} className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider ${tab === 'submissions' ? 'bg-[var(--accent)] text-[#15130f]' : 'bg-[var(--surface-2)] text-[var(--ink)]'}`}>
          Submissions
        </button>
        <button onClick={() => setTab('flags')} className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider ${tab === 'flags' ? 'bg-[var(--accent)] text-[#15130f]' : 'bg-[var(--surface-2)] text-[var(--ink)]'}`}>
          Flags {flags.filter(f => f.status === 'open').length > 0 && `(${flags.filter(f => f.status === 'open').length})`}
        </button>
        <button onClick={() => setTab('adverts')} className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider ${tab === 'adverts' ? 'bg-[var(--accent)] text-[#15130f]' : 'bg-[var(--surface-2)] text-[var(--ink)]'}`}>
          Adverts {ads.filter(ad => ad.status === 'pending').length > 0 && `(${ads.filter(ad => ad.status === 'pending').length})`}
        </button>
      </div>

      {tab === 'submissions' && (
        <>
          <div className="mt-6 flex items-center gap-3 border border-white/10 bg-[var(--surface)] px-4 py-3">
            <Search size={18} />
            <input value={q} onChange={e => setQ(e.target.value)} className="w-full bg-transparent outline-none" placeholder="Search submissions..." />
          </div>

          {loadError && (
            <div className="mt-6 flex items-center gap-2 border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              <AlertTriangle size={16} /> {loadError}
            </div>
          )}

          <div className="mt-6 overflow-x-auto border border-white/10 bg-[var(--surface)]">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-[var(--surface)]">
            <tr>{['Evidence', 'Location', 'Uploader', 'Status', 'Set verification on approve', 'Action'].map(h => <th key={h} className="px-5 py-4 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-white/10 last:border-0 align-top">
                <td className="px-5 py-5">
                  <div className="flex gap-3">
                    {r.thumbnailUrl ? (
                      <img src={r.thumbnailUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-[var(--surface-2)] text-[var(--muted)]">
                        {r.isLink ? <LinkIcon size={16} /> : <FileText size={16} />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold">{r.title}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        {r.id.slice(0, 8)} · {r.created_at?.slice(0, 10)} · {r.isLink ? 'Link' : 'Uploaded file'}
                      </div>
                      {r.mediaUrl && (
                        <a href={r.mediaUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block max-w-[220px] truncate text-xs font-semibold underline">
                          {r.isLink ? r.mediaUrl : 'View submitted file'}
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-5">{r.location}</td>
                <td className="px-5 py-5">{r.uploader_name || 'Anonymous'}</td>
                <td className="px-5 py-5">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{STATUS_LABEL[r.status]}</span>
                </td>
                <td className="px-5 py-5">
                  <select
                    value={verificationChoice[r.id] || 'User Submitted'}
                    onChange={e => setVerificationChoice(v => ({...v, [r.id]: e.target.value}))}
                    className="border border-white/15 bg-[var(--surface)] px-3 py-2 text-xs"
                    disabled={r.status === 'approved'}
                  >
                    {VERIFICATION_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td className="px-5 py-5">
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === r.id || r.status === 'approved'}
                      onClick={() => act(r.id, 'approved')}
                      className="rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[#15130f] disabled:opacity-40"
                    >
                      {busyId === r.id ? '…' : 'Approve'}
                    </button>
                    <button
                      disabled={busyId === r.id || r.status === 'approved'}
                      onClick={() => act(r.id, 'needs_more_information')}
                      className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold disabled:opacity-40"
                    >
                      Needs info
                    </button>
                    <button
                      disabled={busyId === r.id || r.status === 'approved'}
                      onClick={() => act(r.id, 'rejected')}
                      className="rounded-full border border-red-900/50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div className="p-12 text-center text-[var(--muted)]">No submissions match your search.</div>}
        {loading && <div className="p-12 text-center text-[var(--muted)]">Loading submissions…</div>}
          </div>
        </>
      )}

      {tab === 'adverts' && (
        <div className="mt-6 overflow-x-auto border border-white/10 bg-[var(--surface)]">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-[var(--surface)]">
              <tr>{['Advert', 'Advertiser', 'Dates', 'Status', 'Action'].map(h => <th key={h} className="px-5 py-4 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {ads.map(ad => (
                <tr key={ad.id} className="border-b border-white/10 last:border-0 align-top">
                  <td className="px-5 py-5">
                    <div className="flex gap-3">
                      {ad.media_type === 'video' && ad.media_url ? <video src={ad.media_url} muted className="h-14 w-20 shrink-0 rounded object-cover" /> : ad.media_type === 'image' && (ad.media_url || ad.image_url) ? <img src={ad.media_url || ad.image_url || ''} alt="" className="h-14 w-20 shrink-0 rounded object-cover" /> : <div className="h-14 w-20 shrink-0 rounded bg-[var(--surface-2)]" />}
                      <div><div className="font-bold">{ad.title}</div><p className="mt-1 max-w-md text-xs text-[var(--muted)]">{ad.description}</p><a href={ad.target_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">Open destination</a></div>
                    </div>
                  </td>
                  <td className="px-5 py-5">{ad.advertiser_name}<div className="mt-1 text-xs text-[var(--muted)]">{[ad.contact_whatsapp && `WhatsApp: ${ad.contact_whatsapp}`, ad.contact_email].filter(Boolean).join(' · ')}</div></td>
                  <td className="px-5 py-5 text-xs">{ad.start_date || 'Now'} - {ad.end_date || 'Ongoing'}<div className="mt-2 text-[var(--muted)]">{ad.analytics?.impressions ?? 0} views · {ad.analytics?.clicks ?? 0} clicks</div></td>
                  <td className="px-5 py-5"><span className="rounded-full border border-white/10 px-3 py-1 text-xs">{ad.status}</span></td>
                  <td className="px-5 py-5"><div className="flex gap-2"><button disabled={adBusyId === ad.id || ad.status === 'approved'} onClick={() => actOnAd(ad.id, 'approved')} className="rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[#15130f] disabled:opacity-40">{adBusyId === ad.id ? '...' : 'Approve'}</button><button disabled={adBusyId === ad.id || ad.status === 'rejected'} onClick={() => actOnAd(ad.id, 'rejected')} className="rounded-full border border-red-900/50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">Reject</button>{ad.status === 'approved' && <button disabled={adBusyId === ad.id} onClick={() => toggleAd(ad.id, !!ad.paused_at)} className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold">{ad.paused_at ? 'Resume' : 'Pause'}</button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!adsLoading && ads.length === 0 && <div className="p-12 text-center text-[var(--muted)]">No advert requests yet.</div>}
          {adsLoading && <div className="p-12 text-center text-[var(--muted)]">Loading advert requests...</div>}
        </div>
      )}

      {tab === 'flags' && (
        <div className="mt-6 overflow-x-auto border border-white/10 bg-[var(--surface)]">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-[var(--surface)]">
              <tr>{['Record', 'Reason', 'Details', 'Reporter', 'Status', 'Action'].map(h => <th key={h} className="px-5 py-4 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {flags.map(f => (
                <tr key={f.id} className="border-b border-white/10 last:border-0 align-top">
                  <td className="px-5 py-5">
                    {f.evidence ? (
                      <Link href={`/evidence/${f.evidence.slug}`} target="_blank" className="font-bold underline">{f.evidence.title}</Link>
                    ) : (
                      <span className="text-[var(--muted)]">Record deleted</span>
                    )}
                    <div className="mt-1 text-xs text-[var(--muted)]">{f.created_at?.slice(0, 10)}</div>
                  </td>
                  <td className="px-5 py-5 font-semibold">{f.reason}</td>
                  <td className="max-w-xs px-5 py-5 text-[var(--muted)]">{f.details || '—'}</td>
                  <td className="px-5 py-5">{f.reporter_email || 'Anonymous'}</td>
                  <td className="px-5 py-5">
                    <span className={`rounded-full border px-3 py-1 text-xs ${f.status === 'open' ? 'border-amber-300 bg-amber-950/40' : 'border-white/10'}`}>{f.status}</span>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex gap-2">
                      <button disabled={flagBusyId === f.id || f.status !== 'open'} onClick={() => actOnFlag(f.id, 'resolved')} className="rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[#15130f] disabled:opacity-40">
                        Resolved
                      </button>
                      <button disabled={flagBusyId === f.id || f.status !== 'open'} onClick={() => actOnFlag(f.id, 'dismissed')} className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold disabled:opacity-40">
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!flagsLoading && flags.length === 0 && <div className="p-12 text-center text-[var(--muted)]">No reports yet.</div>}
          {flagsLoading && <div className="p-12 text-center text-[var(--muted)]">Loading reports…</div>}
        </div>
      )}

      <div className="mt-8 flex items-start gap-3 border border-white/10 bg-[var(--surface-2)] px-5 py-5 text-sm">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" />
        <p>
          <strong>Access note:</strong> this console is protected by a single shared password (ADMIN_PASSWORD). For a multi-admin
          setup with individual accounts and audit trails, upgrade to Supabase Auth + Row Level Security policies keyed on
          <code className="mx-1 rounded bg-[var(--surface)]/15 px-1.5 py-0.5">auth.uid()</code> — the RLS scaffolding for that is already in
          <code className="mx-1 rounded bg-[var(--surface)]/15 px-1.5 py-0.5">lib/supabase.sql</code>.
        </p>
      </div>
    </main>
  );
}

function Stat({label, value, icon}: {label: string; value: number; icon: React.ReactNode}) {
  return (
    <div className="border border-white/10 bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between text-[var(--muted)]">
        {label}
        {icon}
      </div>
      <div className="editorial-serif mt-4 text-5xl">{value}</div>
    </div>
  );
}
