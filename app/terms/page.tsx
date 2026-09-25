import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Terms | Public Record',
  description: 'Terms for using the Public Record archive and submission tools.',
};

export default function TermsPage() {
  return <main className="mx-auto max-w-4xl px-5 py-20">
    <p className="eyebrow">Trust & accountability</p>
    <h1 className="editorial-serif mt-3 text-6xl md:text-8xl">Terms.</h1>
    <div className="prose mt-10 max-w-none text-lg leading-8 text-[var(--ink)]/85">
      <p>Public Record is a source-led archive. It is provided for research and public-interest information, not as a substitute for independent verification or professional advice.</p>
      <h2 className="editorial-serif mt-12 text-4xl">Using the archive</h2>
      <p>Do not use the site to harass, impersonate, threaten or expose private information about another person. Do not submit unlawful, malicious or knowingly misleading material.</p>
      <h2 className="editorial-serif mt-12 text-4xl">Submitting material</h2>
      <p>You confirm that you have the right to submit material and that your description is accurate to the best of your knowledge. Submission does not guarantee publication. Moderators may request more information, reject material or remove a record after review.</p>
      <h2 className="editorial-serif mt-12 text-4xl">Accuracy and availability</h2>
      <p>Verification labels describe the archive's review status; they are not a guarantee that every underlying claim is true. Sources can change or disappear. Use the original source and archived snapshot where available.</p>
      <p className="mt-8 text-sm text-[var(--muted)]">These terms should be reviewed for the jurisdiction and organization operating the archive before launch.</p>
    </div>
  </main>;
}
