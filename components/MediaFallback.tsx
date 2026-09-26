import {ImageOff} from 'lucide-react';

/** Same box a thumbnail <img> would occupy, shown when there's no usable
 *  image at all — a scraped-but-unverifiable link, an upload with no
 *  extractable poster, etc. — so evidence with a missing thumbnail reads as
 *  "no preview available" rather than as a broken page. */
export function MediaFallback({className, label = 'No preview available'}: {className?: string; label?: string}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 bg-[var(--surface-2)] text-[var(--muted)] ${className ?? ''}`}>
      <ImageOff size={22} strokeWidth={1.5} />
      <span className="text-[10px] uppercase tracking-widest">{label}</span>
    </div>
  );
}
