import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Corrections | Public Record',
  description: 'How to report errors, missing context or broken sources in Public Record.',
};

export default function CorrectionsPage() {
  return <main className="mx-auto max-w-4xl px-5 py-20">
    <p className="eyebrow">Trust & accountability</p>
    <h1 className="editorial-serif mt-3 text-6xl md:text-8xl">Corrections.</h1>
    <div className="prose mt-10 max-w-none text-lg leading-8 text-[var(--ink)]/85">
      <p>Every published evidence page has a report control. Use it for factual errors, outdated information, missing context, wrong attribution, broken links or other concerns.</p>
      <h2 className="editorial-serif mt-12 text-4xl">What to include</h2>
      <p>Describe the exact record, identify the problem, and provide a reliable source or replacement information where possible. Specific reports help moderators investigate quickly.</p>
      <h2 className="editorial-serif mt-12 text-4xl">How review works</h2>
      <p>Reports enter a moderation queue and are recorded in the admin console. A moderator may resolve the report, request more information, update the record or dismiss it with notes. Changes should preserve the historical record rather than silently rewriting it.</p>
      <h2 className="editorial-serif mt-12 text-4xl">Urgent concerns</h2>
      <p>For privacy, copyright or safety concerns, use the report control and explain why the material requires urgent review. Do not include sensitive personal information unless it is necessary to investigate the report.</p>
    </div>
  </main>;
}
