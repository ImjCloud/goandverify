'use client';

import {useState} from 'react';
import {CheckCircle2, Loader2, Megaphone} from 'lucide-react';

export default function AdvertisePage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    form.set('rightsConfirmed', 'true');
    try {
      const response = await fetch('/api/ads', {method: 'POST', body: form});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not send your request.');
      setSent(true);
      event.currentTarget.reset();
    } catch (requestError: any) {
      setError(requestError.message || 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <main className="mx-auto max-w-3xl px-5 py-28 text-center"><CheckCircle2 className="mx-auto text-[var(--accent)]" size={48}/><h1 className="editorial-serif mt-6 text-6xl">Request received.</h1><p className="mt-5 text-lg leading-8 text-[var(--muted)]">Your advert is now with the admin team. It will appear on the advert board only after approval.</p></main>;

  return <main className="mx-auto max-w-4xl px-5 py-20"><div className="flex items-center gap-3 text-[var(--accent)]"><Megaphone size={20}/><p className="eyebrow text-[var(--accent)]">Advertise with us</p></div><h1 className="editorial-serif mt-3 text-6xl md:text-8xl">Put your work here.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">Share a civic project, event, publication, service or community initiative. Every advert is reviewed before it appears publicly.</p>{error&&<p role="alert" className="mt-8 border border-red-900/50 bg-red-950/40 px-5 py-4 text-sm text-red-300">{error}</p>}<form onSubmit={submit} encType="multipart/form-data" className="mt-12 grid gap-5 border-t border-white/10 pt-8"><label className="grid gap-2 text-sm font-semibold">Advertiser or organisation<input name="advertiserName" required maxLength={120} className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label><label className="grid gap-2 text-sm font-semibold">Contact email<input name="contactEmail" type="email" required className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label><label className="grid gap-2 text-sm font-semibold">Advert title<input name="title" required maxLength={120} placeholder="Community health event" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label><label className="grid gap-2 text-sm font-semibold">Short description<textarea name="description" required maxLength={500} rows={4} placeholder="What should people know?" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label><label className="grid gap-2 text-sm font-semibold">Advert format<select name="mediaType" defaultValue="image" className="border border-white/15 bg-[var(--surface)] px-4 py-3"><option value="image">Flyer or banner image</option><option value="video">Video</option><option value="link">Link card</option></select></label><label className="grid gap-2 text-sm font-semibold">Upload advert media <span className="font-normal text-[var(--muted)]">(optional)</span><input name="mediaFile" type="file" accept="image/*,video/*" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label><label className="grid gap-2 text-sm font-semibold">Advert media URL <span className="font-normal text-[var(--muted)]">(use instead of upload)</span><input name="mediaUrl" type="url" placeholder="https://...image.jpg or video.mp4" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/><span className="text-xs font-normal text-[var(--muted)]">Provide either an upload or a public media URL.</span></label><label className="grid gap-2 text-sm font-semibold">Destination link<input name="targetUrl" type="url" required placeholder="https://..." className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label><label className="grid gap-2 text-sm font-semibold">Preview image URL <span className="font-normal text-[var(--muted)]">(optional for video or link adverts)</span><input name="imageUrl" type="url" placeholder="https://..." className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Start date <span className="font-normal text-[var(--muted)]">(optional)</span><input name="startDate" type="date" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label><label className="grid gap-2 text-sm font-semibold">End date <span className="font-normal text-[var(--muted)]">(optional)</span><input name="endDate" type="date" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label></div><button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-4 text-sm font-bold text-[#15130f] disabled:opacity-60">{busy&&<Loader2 size={16} className="animate-spin"/>}{busy?'Sending...':'Send advert for review'}</button></form></main>;
}