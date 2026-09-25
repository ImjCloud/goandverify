'use client';

import {useState} from 'react';
import {Bell, CheckCircle2, Loader2} from 'lucide-react';

type FollowType = 'person' | 'issue' | 'location';

export function FollowForm({initialType = 'issue', initialValue = ''}: {initialType?: FollowType; initialValue?: string}) {
  const [targetType, setTargetType] = useState<FollowType>(initialType);
  const [targetValue, setTargetValue] = useState(initialValue);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('saving');
    setMessage('');
    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, targetType, targetValue, electionCycle: '2027'}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save this follow request.');
      setState('saved');
      setMessage('Follow request saved. Email notifications will be enabled when the notification service is connected.');
    } catch (error: any) {
      setState('error');
      setMessage(error?.message || 'Could not save this follow request.');
    }
  }

  return (
    <section className="border border-white/10 bg-[var(--surface)] p-5" aria-label="Follow updates">
      <div className="flex items-start gap-3">
        <Bell size={18} className="mt-1 shrink-0 text-[var(--accent)]" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-bold">Follow updates</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Get notified when new evidence or corrections are published for a person, issue, or location.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[150px_1fr]">
        <label className="grid gap-1 text-xs font-semibold">
          Follow
          <select value={targetType} onChange={event => setTargetType(event.target.value as FollowType)} className="border border-white/15 bg-[var(--surface-2)] px-3 py-2.5 text-sm">
            <option value="person">A person</option>
            <option value="issue">An issue</option>
            <option value="location">A location</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          {targetType === 'person' ? 'Person slug or name' : targetType === 'issue' ? 'Issue or topic' : 'Location'}
          <input required minLength={2} maxLength={120} value={targetValue} onChange={event => setTargetValue(event.target.value)} placeholder={targetType === 'person' ? 'peter-obi' : targetType === 'issue' ? 'Education funding' : 'Anambra State'} className="border border-white/15 bg-[var(--surface-2)] px-3 py-2.5 text-sm" />
        </label>
        <label className="grid gap-1 text-xs font-semibold sm:col-span-2">
          Email address
          <input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="border border-white/15 bg-[var(--surface-2)] px-3 py-2.5 text-sm" />
        </label>
        <button disabled={state === 'saving'} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3 text-xs font-bold text-[#15130f] disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
          {state === 'saving' && <Loader2 size={14} className="animate-spin" />}
          {state === 'saved' && <CheckCircle2 size={14} />}
          {state === 'saving' ? 'Saving...' : state === 'saved' ? 'Follow saved' : 'Follow updates'}
        </button>
        {message && <p className={`text-xs leading-5 sm:col-span-2 ${state === 'error' ? 'text-red-400' : 'text-[var(--muted)]'}`} role={state === 'error' ? 'alert' : 'status'}>{message}</p>}
      </form>
    </section>
  );
}
