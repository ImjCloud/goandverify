'use client';
import {useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {ShieldCheck, Search, Check, X, Clock3, FileText, Lock, Loader2, AlertTriangle, Link as LinkIcon, Flag, Pause, Play, Trash2, MousePointerClick, Eye, BarChart3} from 'lucide-react';

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

type CampaignEventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  media_type: 'image' | 'video' | 'none';
  media_url: string | null;
  image_url: string | null;
  href: string | null;
  created_at: string;
};

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
  analytics?: {impressions: number; clicks: number; ctr: number};
};

export default function Admin() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState<'submissions' | 'flags' | 'adverts' | 'events'>('submissions');
  const [events, setEvents] = useState<CampaignEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventBusyId, setEventBusyId] = useState<string | null>(null);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [campaignMediaMode, setCampaignMediaMode] = useState<'file' | 'link'>('file');
  const [campaignMediaUrl, setCampaignMediaUrl] = useState('');
  const [campaignPosterUrl, setCampaignPosterUrl] = useState('');
  const [rows, setRows] = useState<Submission[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagBusyId, setFlagBusyId] = useState<string | null>(null);
  const [ads, setAds] = useState<AdRequest[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adBusyId, setAdBusyId] = useState<string | null>(null);
  const [adActionError, setAdActionError] = useState<string | null>(null);
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
    setAdActionError(null);
    try {
      const res = await fetch('/api/admin/ads', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, status})});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not update this advert.');
      }
      await loadAds();
    } catch (error: any) {
      setAdActionError(error?.message || 'Could not update this advert.');
    } finally {
      setAdBusyId(null);
    }
  }

  async function cancelAd(id: string) {
    if (!window.confirm('Cancel and permanently remove this advert request? This will also remove its uploaded media and analytics.')) return;
    setAdBusyId(id);
    setAdActionError(null);
    try {
      const res = await fetch('/api/admin/ads', {method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id})});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not cancel this advert.');
      await loadAds();
    } catch (error: any) {
      setAdActionError(error?.message || 'Could not cancel this advert.');
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

  async function loadEvents() {
    setEventsLoading(true);
    try {
      const res = await fetch('/api/admin/campaign-events');
      const data = await res.json();
      if (res.ok) setEvents(data.events ?? []);
    } finally {
      setEventsLoading(false);
    }
  }

  async function createEvent(form: FormData) {
    setEventSaving(true);
    setEventError(null);
    try {
      const res = await fetch('/api/admin/campaign-events', {method: 'POST', body: form});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEventError(data.error || 'Could not save the event.');
        return;
      }
      await loadEvents();
      return true;
    } catch {
      setEventError('Could not save the event.');
    } finally {
      setEventSaving(false);
    }
  }

  async function deleteEvent(id: string) {
    setEventBusyId(id);
    try {
      const res = await fetch(`/api/admin/campaign-events/${id}`, {method: 'DELETE'});
      if (res.ok) setEvents(prev => prev.filter(e => e.id !== id));
    } finally {
      setEventBusyId(null);
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
    if (requestedTab === 'events' || requestedTab === 'flags' || requestedTab === 'adverts' || requestedTab === 'submissions') {
      setTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (tab === 'flags' && flags.length === 0) loadFlags();
    if (tab === 'adverts' && ads.length === 0) loadAds();
    if (tab === 'events' && events.length === 0) loadEvents();
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

  async function manageSubmission(id: string, action: 'archive' | 'delete') {
    const message = action === 'delete'
      ? 'Delete this submission and its published evidence permanently? This cannot be undone.'
      : 'Archive this published evidence? It will remain in the database but will no longer be treated as current verified evidence.';
    if (!window.confirm(message)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: action === 'archive' ? JSON.stringify({action: 'archive'}) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Could not ${action} submission.`);
      await loadSubmissions();
    } catch (e: any) {
      setLoadError(e.message || `Could not ${action} submission.`);
    } finally {
      setBusyId(null);
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
          <p className="eyebrow">Moderation & campaign publishing</p>
          <h1 className="editorial-serif mt-3 text-5xl md:text-7xl">Evidence review.</h1>
          <p className="mt-4 max-w-2xl text-[var(--muted)]">Review evidence submissions, then manage the campaign media that powers the public What's New section.</p>
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
        <button onClick={() => setTab('events')} className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider ${tab === 'events' ? 'bg-[var(--accent)] text-[#15130f]' : 'bg-[var(--surface-2)] text-[var(--ink)]'}`}>
          Events
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
                    {r.status === 'approved' && (
                      <>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => manageSubmission(r.id, 'archive')}
                          className="rounded-full border border-amber-700/50 px-3 py-2 text-xs font-bold text-amber-700 disabled:opacity-40"
                        >
                          Archive
                        </button>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => manageSubmission(r.id, 'delete')}
                          className="rounded-full border border-red-900/50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </>
                    )}
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
        <div className="mt-6">
          {adActionError && (
            <div className="mb-4 flex items-start gap-2 border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div><strong>Advert action failed.</strong><div className="mt-1">{adActionError}</div></div>
            </div>
          )}

          {(() => {
            const totalViews = ads.reduce((n, ad) => n + (ad.analytics?.impressions ?? 0), 0);
            const totalClicks = ads.reduce((n, ad) => n + (ad.analytics?.clicks ?? 0), 0);
            const activeAds = ads.filter(ad => ad.status === 'approved' && !ad.paused_at).length;
            const pausedAds = ads.filter(ad => ad.status === 'approved' && !!ad.paused_at).length;
            const ctr = totalViews ? (totalClicks / totalViews) * 100 : 0;
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <AdMetric label="Total adverts" value={ads.length} icon={<BarChart3 size={18} />} />
                  <AdMetric label="Active" value={activeAds} icon={<Play size={18} />} />
                  <AdMetric label="Paused" value={pausedAds} icon={<Pause size={18} />} />
                  <AdMetric label="Total views" value={totalViews.toLocaleString()} icon={<Eye size={18} />} />
                  <AdMetric label="Total clicks" value={totalClicks.toLocaleString()} icon={<MousePointerClick size={18} />} sub={`CTR ${ctr.toFixed(2)}%`} />
                </div>

                <div className="mt-6 overflow-x-auto border border-white/10 bg-[var(--surface)]">
                  <table className="min-w-[1250px] w-full text-left text-sm">
                    <thead className="border-b border-white/10 bg-[var(--surface)]">
                      <tr>{['Advert', 'Advertiser', 'Schedule', 'Views', 'Clicks', 'CTR', 'Status', 'Controls'].map(h => <th key={h} className="px-5 py-4 font-bold">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {ads.map(ad => {
                        const views = ad.analytics?.impressions ?? 0;
                        const clicks = ad.analytics?.clicks ?? 0;
                        const adCtr = views ? (clicks / views) * 100 : 0;
                        const busy = adBusyId === ad.id;
                        return (
                          <tr key={ad.id} className="border-b border-white/10 last:border-0 align-top">
                            <td className="px-5 py-5">
                              <div className="flex gap-3">
                                {ad.media_type === 'video' && ad.media_url ? <video src={ad.media_url} muted className="h-16 w-24 shrink-0 rounded object-cover" /> : (ad.media_url || ad.image_url) ? <img src={ad.media_url || ad.image_url || ''} alt="" className="h-16 w-24 shrink-0 rounded object-cover" /> : <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded bg-[var(--surface-2)]"><Eye size={18} /></div>}
                                <div className="min-w-[240px]"><div className="font-bold">{ad.title}</div><p className="mt-1 max-w-md text-xs text-[var(--muted)]">{ad.description}</p><div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">{ad.media_type} · {ad.id.slice(0,8)}</div><a href={ad.target_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">Open destination</a></div>
                              </div>
                            </td>
                            <td className="px-5 py-5">{ad.advertiser_name}<div className="mt-1 text-xs text-[var(--muted)]">{[ad.contact_whatsapp && `WhatsApp: ${ad.contact_whatsapp}`, ad.contact_email].filter(Boolean).join(' · ')}</div></td>
                            <td className="px-5 py-5 text-xs whitespace-nowrap">{ad.start_date || 'Now'}<br />to {ad.end_date || 'Ongoing'}</td>
                            <td className="px-5 py-5"><div className="inline-flex items-center gap-1 font-bold"><Eye size={15} />{views.toLocaleString()}</div><div className="mt-1 text-xs text-[var(--muted)]">impressions</div></td>
                            <td className="px-5 py-5"><div className="inline-flex items-center gap-1 font-bold"><MousePointerClick size={15} />{clicks.toLocaleString()}</div><div className="mt-1 text-xs text-[var(--muted)]">destination clicks</div></td>
                            <td className="px-5 py-5 font-bold">{adCtr.toFixed(2)}%</td>
                            <td className="px-5 py-5">
                              <div className="grid gap-2">
                                <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs">{ad.status}</span>
                                {ad.paused_at && <span className="w-fit rounded-full border border-amber-500/30 px-3 py-1 text-xs text-amber-300">Paused</span>}
                              </div>
                            </td>
                            <td className="px-5 py-5">
                              <div className="flex flex-wrap gap-2">
                                <button disabled={busy || ad.status === 'approved'} onClick={() => actOnAd(ad.id, 'approved')} className="rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[#15130f] disabled:opacity-40">{busy ? '...' : 'Approve'}</button>
                                <button disabled={busy || ad.status === 'rejected'} onClick={() => actOnAd(ad.id, 'rejected')} className="rounded-full border border-red-900/50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">Reject</button>
                                {ad.status === 'approved' && <button disabled={busy} onClick={() => toggleAd(ad.id, !!ad.paused_at)} className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-2 text-xs font-bold">{ad.paused_at ? <Play size={13} /> : <Pause size={13} />}{ad.paused_at ? 'Resume' : 'Pause'}</button>}
                                <button disabled={busy} onClick={() => cancelAd(ad.id)} className="inline-flex items-center gap-1 rounded-full border border-red-900/50 px-3 py-2 text-xs font-bold text-red-700"><Trash2 size={13} />Cancel</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!adsLoading && ads.length === 0 && <div className="p-12 text-center text-[var(--muted)]">No advert requests yet.</div>}
                  {adsLoading && <div className="p-12 text-center text-[var(--muted)]">Loading advert analytics...</div>}
                </div>
              </>
            );
          })()}
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

      {tab === 'events' && (
        <div className="mt-6">
          <form
            className="grid gap-4 border border-white/10 bg-[var(--surface)] p-5 sm:grid-cols-2"
            onSubmit={async e => {
              e.preventDefault();
              const form = e.currentTarget;
              const ok = await createEvent(new FormData(form));
              if (ok) {
                form.reset();
                setCampaignMediaUrl('');
                setCampaignPosterUrl('');
                setCampaignMediaMode('file');
              }
            }}
          >
            <div className="sm:col-span-2 border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 text-sm leading-6 text-[var(--muted)]">
              Only campaign media published through this authenticated portal appears in <strong className="text-[var(--ink)]">What's New</strong>. You can upload a file or paste a supported image/video link. Video links use the same 30%-visible scroll autoplay used by Submit Evidence.
            </div>
            <label className="grid gap-1 text-xs font-semibold sm:col-span-2">
              Campaign event title
              <input name="title" required className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-semibold sm:col-span-2">
              Description
              <textarea name="description" rows={2} className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Date
              <input name="eventDate" type="date" className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Location
              <input name="location" className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2">
              <div className="inline-flex overflow-hidden rounded-full border border-white/15">
                <button type="button" onClick={() => setCampaignMediaMode('file')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${campaignMediaMode === 'file' ? 'bg-[var(--accent)] text-[#15130f]' : 'bg-[var(--surface-2)]'}`}>Upload file</button>
                <button type="button" onClick={() => setCampaignMediaMode('link')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${campaignMediaMode === 'link' ? 'bg-[var(--accent)] text-[#15130f]' : 'bg-[var(--surface-2)]'}`}>Paste media link</button>
              </div>
              {campaignMediaMode === 'file' ? (
                <label className="mt-3 grid gap-1 text-xs font-semibold">
                  Campaign image or video
                  <input name="mediaFile" type="file" accept="image/*,video/*" className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm" />
                </label>
              ) : (
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-xs font-semibold">
                    Image/video link
                    <input name="mediaUrl" value={campaignMediaUrl} onChange={e => setCampaignMediaUrl(e.target.value)} required={campaignMediaMode === 'link'} type="url" placeholder="YouTube, Vimeo, TikTok, X, direct image/video URL" className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold">
                    Video poster / image thumbnail <span className="font-normal text-[var(--muted)]">(optional)</span>
                    <input name="thumbnailUrl" value={campaignPosterUrl} onChange={e => setCampaignPosterUrl(e.target.value)} type="url" placeholder="https://.../poster.jpg" className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm" />
                  </label>
                  <p className="text-xs leading-5 text-[var(--muted)]">For video links, the poster is shown until the card is about 30% visible; then the muted video starts automatically and pauses again when it leaves the viewport.</p>
                </div>
              )}
            </div>
            <label className="grid gap-1 text-xs font-semibold sm:col-span-2">
              More-info link <span className="font-normal text-[var(--muted)]">(optional)</span>
              <input name="href" type="url" placeholder="https://..." className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm" />
            </label>
            {eventError && <p className="text-xs font-semibold text-red-700 sm:col-span-2">{eventError}</p>}
            <button disabled={eventSaving} className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#15130f] disabled:opacity-50 sm:col-span-2 sm:w-fit">
              {eventSaving ? 'Publishing...' : 'Publish campaign update'}
            </button>
          </form>

          <div className="mt-6 overflow-x-auto border border-white/10 bg-[var(--surface)]">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-[var(--surface)]">
                <tr>{['Event', 'Date', 'Location', 'Action'].map(h => <th key={h} className="px-5 py-4 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="border-b border-white/10 last:border-0 align-top">
                    <td className="px-5 py-5">
                      <div className="flex gap-3">
                        {ev.media_type === 'video' && ev.media_url ? <video src={ev.media_url} muted className="h-14 w-20 shrink-0 rounded object-cover" /> : (ev.media_url || ev.image_url) ? <img src={ev.media_url || ev.image_url || ''} alt="" className="h-14 w-20 shrink-0 rounded object-cover" /> : <div className="h-14 w-20 shrink-0 rounded bg-[var(--surface-2)]" />}
                        <div><div className="font-bold">{ev.title}</div>{ev.description && <p className="mt-1 max-w-md text-xs text-[var(--muted)]">{ev.description}</p>}</div>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-xs">{ev.event_date || '—'}</td>
                    <td className="px-5 py-5 text-xs">{ev.location || '—'}</td>
                    <td className="px-5 py-5"><button disabled={eventBusyId === ev.id} onClick={() => deleteEvent(ev.id)} className="rounded-full border border-red-900/50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">{eventBusyId === ev.id ? '...' : 'Delete'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!eventsLoading && events.length === 0 && <div className="p-12 text-center text-[var(--muted)]">No campaign uploads yet. Upload an image or video above to populate What's New.</div>}
            {eventsLoading && <div className="p-12 text-center text-[var(--muted)]">Loading events…</div>}
          </div>
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

function AdMetric({label, value, icon, sub}: {label: string; value: string | number; icon: React.ReactNode; sub?: string}) {
  return (
    <div className="border border-white/10 bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between text-[var(--muted)]">{label}{icon}</div>
      <div className="editorial-serif mt-4 text-4xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
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
