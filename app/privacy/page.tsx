import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Privacy | Public Record',
  description: 'How Public Record handles submissions, reports and site usage data.',
};

export default function PrivacyPage() {
  return <main className="mx-auto max-w-4xl px-5 py-20">
    <p className="eyebrow">Trust & accountability</p>
    <h1 className="editorial-serif mt-3 text-6xl md:text-8xl">Privacy.</h1>
    <div className="prose mt-10 max-w-none text-lg leading-8 text-[var(--ink)]/85">
      <p>Public Record collects only the information needed to review submissions, respond to reports and operate the archive.</p>
      <h2 className="editorial-serif mt-12 text-4xl">Submissions and reports</h2>
      <p>Material submitted for review may include files, links, descriptions, names and optional contact details. Reported contact details are used only to follow up on the reported record. We do not publish a submitter's name or email without a clear editorial reason and appropriate consent.</p>
      <h2 className="editorial-serif mt-12 text-4xl">Security and retention</h2>
      <p>Submission data is restricted to moderators. We retain records for as long as they are needed for editorial review, corrections and the public archive. Uploaded material may be retained as part of the archive's provenance record.</p>
      <h2 className="editorial-serif mt-12 text-4xl">Third-party services</h2>
      <p>The site may use Supabase for storage and database services, and external media or archive providers when a record links to them. Those services may process requests according to their own policies.</p>
      <p className="mt-8 text-sm text-[var(--muted)]">This page describes the current product behavior. Obtain jurisdiction-specific legal advice before treating it as a complete privacy notice.</p>
    </div>
  </main>;
}
