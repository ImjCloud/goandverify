import fs from 'fs';
import path from 'path';
import type {GalleryItem, Person} from './data';

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|svg)$/i;

/**
 * Auto-discovers gallery images for a person from /public/gallery/<slug>/.
 *
 * Drop image files into that folder — no code changes needed. Files are sorted
 * naturally (so "01-...", "02-..." order the way you'd expect), and a caption is
 * derived from the filename. Falls back to the hardcoded `person.gallery`
 * placeholders in lib/data.ts if the folder is missing or empty.
 *
 * Example: public/gallery/peter-obi/01-campaign-rally-lagos-2026.jpg
 *   -> alt: "Peter Gregory Obi — photo 1"
 *   -> caption: "Campaign Rally Lagos 2026"
 */
export function getPersonGallery(person: Person): GalleryItem[] {
  const dir = path.join(process.cwd(), 'public', 'gallery', person.slug);
  try {
    const files = fs
      .readdirSync(dir)
      .filter(f => IMAGE_EXT.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

    if (files.length === 0) return person.gallery;

    return files.map((file, i) => ({
      src: `/gallery/${person.slug}/${file}`,
      alt: `${person.name} — photo ${i + 1}`,
      caption: captionFromFilename(file),
    }));
  } catch {
    // folder doesn't exist yet — use the placeholders
    return person.gallery;
  }
}

function captionFromFilename(file: string): string {
  const base = file.replace(/\.[^.]+$/, '');
  const cleaned = base
    .replace(/^\d+[-_ ]*/, '') // strip a leading "01-" ordering prefix
    .replace(/[-_]+/g, ' ')
    .trim();
  return cleaned ? cleaned.replace(/\b\w/g, c => c.toUpperCase()) : 'Public appearance';
}
