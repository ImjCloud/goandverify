'use client';
import {useState, useRef, useCallback} from 'react';
import {UploadCloud, CheckCircle2, AlertTriangle, Loader2, Link2, LinkIcon, Play} from 'lucide-react';

type Preview = {
  thumbnailUrl: string | null;
  title: string | null;
  mediaType: 'youtube' | 'vimeo' | 'image' | 'video-file' | 'webpage';
} | null;

export default function Submit() {
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'file' | 'link'>('file');

  const [mediaUrl, setMediaUrl] = useState('');
  const [preview, setPreview] = useState<Preview>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPreview = useCallback((url: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreview(null);
    setPreviewError(null);
    if (!url.trim()) return;
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch('/api/link-preview', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({url}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not preview that link.');
        setPreview(data);
      } catch (e: any) {
        setPreviewError(e.message || 'Could not preview that link.');
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const submission = new FormData();
    submission.set('title', String(fd.get('title') ?? ''));
    submission.set('description', String(fd.get('description') ?? ''));
    submission.set('location', String(fd.get('location') ?? ''));
    submission.set('eventDate', String(fd.get('eventDate') ?? ''));
    submission.set('sourceUrl', String(fd.get('sourceUrl') ?? ''));
    submission.set('uploaderName', String(fd.get('uploaderName') ?? ''));
    submission.set('eventCategory', String(fd.get('eventCategory') ?? 'campaign_activity'));
    submission.set('aboutPerson', String(fd.get('aboutPerson') ?? ''));
    submission.set('consent', fd.get('consent') ? 'true' : 'false');

    if (mode === 'file') {
      const file = fd.get('file') as File | null;
      if (!file || file.size === 0) {
        setError('Please choose a file to upload, or switch to "Paste a link".');
        return;
      }
      submission.set('file', file);
    } else {
      if (!mediaUrl.trim()) {
        setError('Please paste a link, or switch to "Upload a file".');
        return;
      }
      submission.set('mediaUrl', mediaUrl.trim());
      if (preview?.thumbnailUrl) submission.set('thumbnailUrl', preview.thumbnailUrl);
      if (preview?.title) submission.set('mediaTitle', preview.title);
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {method: 'POST', body: submission});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      setDone(true);
      form.reset();
      setMediaUrl('');
      setPreview(null);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-28 text-center">
        <CheckCircle2 className="mx-auto" size={48} />
        <h1 className="editorial-serif mt-6 text-6xl">Submission received.</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
          Your material is marked for review. It will not appear in the public archive until a reviewer checks its provenance and metadata.
        </p>
        <button onClick={() => setDone(false)} className="mt-8 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[#15130f]">
          Submit another
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-20">
      <p className="eyebrow">Contribute</p>
      <h1 className="editorial-serif mt-3 text-6xl md:text-8xl">Submit evidence.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
        Share a relevant image, video, audio recording or document — as a file, or a link to where it already lives online.
        Submission does not mean publication: every item enters review first.
      </p>

      {error && (
        <div className="mt-8 flex items-start gap-3 border border-red-900/50 bg-red-950/40 px-5 py-4 text-sm text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-12 grid gap-6 border-t border-white/10 pt-8">
        <label className="grid gap-2 text-sm font-semibold">
          Evidence title
          <input name="title" required className="border border-white/15 bg-[var(--surface)] px-4 py-3" placeholder="Give the record a clear title" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          What does this evidence show?
          <textarea name="description" required rows={5} className="border border-white/15 bg-[var(--surface)] px-4 py-3" placeholder="Describe the material without making unsupported claims." />
        </label>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Where did this happen?
            <input name="location" required className="border border-white/15 bg-[var(--surface)] px-4 py-3" placeholder="City, state, country" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            When did this happen?
            <input name="eventDate" type="date" className="border border-white/15 bg-[var(--surface)] px-4 py-3" />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold">
          Original source URL <span className="font-normal text-[var(--muted)]">(where this was first published, if different from the evidence link below)</span>
          <input name="sourceUrl" type="url" className="border border-white/15 bg-[var(--surface)] px-4 py-3" placeholder="https://..." />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Your name <span className="font-normal text-[var(--muted)]">(optional)</span>
          <input name="uploaderName" className="border border-white/15 bg-[var(--surface)] px-4 py-3" />
        </label>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            What kind of record is this?
            <select name="eventCategory" required defaultValue="campaign_activity" className="border border-white/15 bg-[var(--surface)] px-4 py-3">
              <option value="campaign_activity">Campaign activity (rally, visit, appearance)</option>
              <option value="historical_event">Historical event / past record</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Who is this about? <span className="font-normal text-[var(--muted)]">(optional)</span>
            <select name="aboutPerson" defaultValue="" className="border border-white/15 bg-[var(--surface)] px-4 py-3">
              <option value="">Not specific to one person</option>
              <option value="peter-obi">Peter Obi</option>
              <option value="rabiu-kwankwaso">Rabiu Kwankwaso</option>
              <option value="both">Both</option>
            </select>
          </label>
        </div>

        <div>
          <span className="text-sm font-semibold">The evidence itself</span>
          <div className="mt-2 inline-flex overflow-hidden rounded-full border border-white/15">
            <button type="button" onClick={() => setMode('file')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${mode === 'file' ? 'bg-[var(--accent)] text-[#15130f]' : 'bg-[var(--surface-2)] text-[var(--ink)]'}`}>
              <UploadCloud size={13} className="mr-1.5 inline" /> Upload a file
            </button>
            <button type="button" onClick={() => setMode('link')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${mode === 'link' ? 'bg-[var(--accent)] text-[#15130f]' : 'bg-[var(--surface-2)] text-[var(--ink)]'}`}>
              <Link2 size={13} className="mr-1.5 inline" /> Paste a link
            </button>
          </div>

          {mode === 'file' ? (
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-white/20 bg-[var(--surface)] px-5 py-12 text-center">
              <UploadCloud size={28} />
              <span className="font-bold">Upload image, video, audio or document</span>
              <span className="text-xs text-[var(--muted)]">Images, video, audio, PDF or Word files, up to 50MB.</span>
              <input name="file" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" className="sr-only" />
            </label>
          ) : (
            <div className="mt-4 border border-white/15 bg-[var(--surface)] p-5">
              <label className="flex items-center gap-3 border border-white/15 bg-[var(--surface)] px-4 py-3">
                <LinkIcon size={16} className="shrink-0 text-[var(--muted)]" />
                <input
                  value={mediaUrl}
                  onChange={e => {
                    setMediaUrl(e.target.value);
                    fetchPreview(e.target.value);
                  }}
                  type="url"
                  placeholder="Paste a YouTube, Vimeo, image or video link, or any article URL"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Works with YouTube, Vimeo, direct image/video files, or a webpage — we'll try to pull a thumbnail automatically.
              </p>

              {previewLoading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Loader2 size={16} className="animate-spin" /> Fetching preview…
                </div>
              )}
              {previewError && !previewLoading && (
                <div className="mt-4 flex items-start gap-2 border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{previewError} You can still submit — a reviewer will check the link manually.</span>
                </div>
              )}
              {preview && !previewLoading && (
                <div className="mt-4 flex gap-4 border border-white/10 bg-[var(--surface)] p-4">
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden bg-black">
                    {preview.thumbnailUrl ? (
                      <img src={preview.thumbnailUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/40">
                        <Play size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{preview.mediaType.replace('-', ' ')}</p>
                    <p className="mt-1 truncate text-sm font-semibold">{preview.title || mediaUrl}</p>
                    {!preview.thumbnailUrl && <p className="mt-1 text-xs text-[var(--muted)]">No thumbnail could be detected — it will still be saved as a link.</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <label className="flex gap-3 text-sm leading-6">
          <input name="consent" required type="checkbox" className="mt-1" />
          I confirm I have the right to submit this material and understand it may be reviewed before publication.
        </label>
        <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-4 text-sm font-bold text-[#15130f] disabled:opacity-60">
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </main>
  );
}
