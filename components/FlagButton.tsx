'use client';
import {useState} from 'react';
import {Flag, X, CheckCircle2, Loader2} from 'lucide-react';

const REASONS = ['Factually inaccurate', 'Outdated / no longer current', 'Missing context', 'Wrong attribution or source', 'Broken or dead link', 'Other'];

export function FlagButton({evidenceId}: {evidenceId: string}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError('Please choose a reason.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/flags', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({evidenceId, reason, details, reporterEmail: email || null}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not submit report.');
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--accent)]">
        <Flag size={13} /> Report an issue with this record
      </button>
    );
  }

  return (
    <div className="border border-white/10 bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Report an issue</span>
        <button onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
      </div>

      {done ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-green-400">
          <CheckCircle2 size={16} /> Thanks — this has been sent to a moderator for review.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <select required value={reason} onChange={e => setReason(e.target.value)} className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm">
            <option value="">Select a reason…</option>
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            rows={3}
            placeholder="Add detail (optional, but helps a moderator review faster)"
            className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email (optional — only if you want a reply)"
            className="border border-white/15 bg-[var(--surface-2)] px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-[#15130f] disabled:opacity-60">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Sending…' : 'Submit report'}
          </button>
        </form>
      )}
    </div>
  );
}
