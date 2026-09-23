'use client';
import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {ShieldCheck, Search, Check, X, Clock3, FileText, Lock, Loader2, AlertTriangle, Link as LinkIcon} from 'lucide-react';

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

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verificationChoice, setVerificationChoice] = useState<Record<string, string>>({});

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
          <p className="mt-3 text-neutral-600">Enter the moderation password to review submissions.</p>
        </div>
        {loadError && (
          <p className="mt-6 flex items-start gap-2 border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
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
            className="border border-black/15 bg-white px-4 py-3"
          />
          {loginError && (
            <p className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle size={15} /> {loginError}
            </p>
          )}
          <button disabled={loggingIn} className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
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
          <p className="mt-4 max-w-2xl text-neutral-600">Review provenance and metadata before material enters the public archive.</p>
        </div>
        <Link href="/evidence" className="rounded-full border border-black/15 px-5 py-3 text-sm font-bold">
          View public archive
        </Link>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Stat label="Pending review" value={counts.pending} icon={<Clock3 size={18} />} />
        <Stat label="Approved" value={counts.approved} icon={<Check size={18} />} />
        <Stat label="Rejected" value={counts.rejected} icon={<X size={18} />} />
      </div>

      <div className="mt-10 flex items-center gap-3 border border-black/10 bg-white px-4 py-3">
        <Search size={18} />
        <input value={q} onChange={e => setQ(e.target.value)} className="w-full bg-transparent outline-none" placeholder="Search submissions..." />
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle size={16} /> {loadError}
        </div>
      )}

      <div className="mt-6 overflow-x-auto border border-black/10 bg-white">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-neutral-50">
            <tr>{['Evidence', 'Location', 'Uploader', 'Status', 'Set verification on approve', 'Action'].map(h => <th key={h} className="px-5 py-4 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-black/10 last:border-0 align-top">
                <td className="px-5 py-5">
                  <div className="flex gap-3">
                    {r.thumbnailUrl ? (
                      <img src={r.thumbnailUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-400">
                        {r.isLink ? <LinkIcon size={16} /> : <FileText size={16} />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold">{r.title}</div>
                      <div className="mt-1 text-xs text-neutral-500">
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
                  <span className="rounded-full border border-black/10 px-3 py-1 text-xs">{STATUS_LABEL[r.status]}</span>
                </td>
                <td className="px-5 py-5">
                  <select
                    value={verificationChoice[r.id] || 'User Submitted'}
                    onChange={e => setVerificationChoice(v => ({...v, [r.id]: e.target.value}))}
                    className="border border-black/15 bg-white px-3 py-2 text-xs"
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
                      className="rounded-full bg-black px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                    >
                      {busyId === r.id ? '…' : 'Approve'}
                    </button>
                    <button
                      disabled={busyId === r.id || r.status === 'approved'}
                      onClick={() => act(r.id, 'needs_more_information')}
                      className="rounded-full border border-black/15 px-3 py-2 text-xs font-bold disabled:opacity-40"
                    >
                      Needs info
                    </button>
                    <button
                      disabled={busyId === r.id || r.status === 'approved'}
                      onClick={() => act(r.id, 'rejected')}
                      className="rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div className="p-12 text-center text-neutral-500">No submissions match your search.</div>}
        {loading && <div className="p-12 text-center text-neutral-500">Loading submissions…</div>}
      </div>

      <div className="mt-8 flex items-start gap-3 border border-black/10 bg-black px-5 py-5 text-sm text-white">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" />
        <p>
          <strong>Access note:</strong> this console is protected by a single shared password (ADMIN_PASSWORD). For a multi-admin
          setup with individual accounts and audit trails, upgrade to Supabase Auth + Row Level Security policies keyed on
          <code className="mx-1 rounded bg-white/15 px-1.5 py-0.5">auth.uid()</code> — the RLS scaffolding for that is already in
          <code className="mx-1 rounded bg-white/15 px-1.5 py-0.5">lib/supabase.sql</code>.
        </p>
      </div>
    </main>
  );
}

function Stat({label, value, icon}: {label: string; value: number; icon: React.ReactNode}) {
  return (
    <div className="border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between text-neutral-500">
        {label}
        {icon}
      </div>
      <div className="editorial-serif mt-4 text-5xl">{value}</div>
    </div>
  );
}
