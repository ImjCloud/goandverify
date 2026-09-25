import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact | Public Record',
  description: 'Ways to contact the Public Record archive team about evidence and corrections.',
};

export default function ContactPage() {
  return <main className="mx-auto max-w-4xl px-5 py-20">
    <p className="eyebrow">Get in touch</p>
    <h1 className="editorial-serif mt-3 text-6xl md:text-8xl">Contact.</h1>
    <div className="prose mt-10 max-w-none text-lg leading-8 text-[var(--ink)]/85">
      <p>Use the route that best matches your message so it reaches the right review process.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3 not-prose">
        <Link href="/advertise" className="border border-white/10 bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]"><h2 className="editorial-serif text-2xl">Advertise</h2><p className="mt-3 text-sm text-[var(--muted)]">Request a reviewed advert placement for your project or event.</p></Link>
        <Link href="/submit" className="border border-white/10 bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]"><h2 className="editorial-serif text-2xl">Submit evidence</h2><p className="mt-3 text-sm text-[var(--muted)]">Share a document, image, video, audio recording or source link.</p></Link>
        <Link href="/corrections" className="border border-white/10 bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]"><h2 className="editorial-serif text-2xl">Report a correction</h2><p className="mt-3 text-sm text-[var(--muted)]">Flag inaccurate, outdated or incomplete information on a published record.</p></Link>
        <Link href="/about" className="border border-white/10 bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]"><h2 className="editorial-serif text-2xl">Read the method</h2><p className="mt-3 text-sm text-[var(--muted)]">Understand how provenance, verification and corrections work.</p></Link>
      </div>
      <p className="mt-10 text-sm text-[var(--muted)]">A direct editorial contact channel should be added before public launch so legal, press and accessibility requests can be handled outside the submission queue.</p>
    </div>
  </main>;
}
