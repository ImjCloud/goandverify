import type {Evidence} from './data';
import {evidence as demoEvidence} from './data';
import {supabasePublicConfigured, supabasePublic} from './supabase/server';

const DB_TO_UI_VERIFICATION: Record<string, Evidence['verification']> = {
  submitted: 'User Submitted',
  under_review: 'Under Review',
  source_verified: 'Source Verified',
  partially_verified: 'Partially Verified',
  disputed: 'Disputed',
  archived: 'Archived',
};

// Rows readable by the anon key are already scoped by the RLS policy in
// lib/supabase.sql ("public can read evidence" — verification_status in
// source_verified/partially_verified/disputed/archived). Pending/under-review
// submissions never reach the public site through this path.
function rowToEvidence(row: any): Evidence {
  const eventDate: string | null = row.event_date ?? row.publication_date ?? null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type,
    year: eventDate ? new Date(eventDate).getFullYear() : new Date(row.created_at).getFullYear(),
    date: eventDate ?? row.created_at,
    location: [row.location_city, row.location_state, row.location_country].filter(Boolean).join(', ') || 'Location unspecified',
    author: row.author ?? row.uploader_name ?? 'Unattributed',
    source: row.source_name ?? 'Unspecified source',
    sourceUrl: row.source_url ?? '#',
    description: row.description,
    verification: DB_TO_UI_VERIFICATION[row.verification_status] ?? 'Under Review',
    image: row.thumbnail_url ?? row.media_url ?? '/evidence-1.svg',
    // Kept distinct from `image`: image is always the display thumbnail
    // (often a .jpg even for a video), mediaUrl is the actual underlying
    // link (YouTube/Vimeo/file URL) used to detect and build an embed.
    mediaUrl: row.media_url ?? null,
    tags: Array.isArray(row.tags) ? row.tags.map((t: any) => t?.tag?.name).filter(Boolean) : [],
    waybackUrl: row.wayback_url ?? null,
  };
}

export async function getPublishedEvidence(): Promise<Evidence[]> {
  if (!supabasePublicConfigured) return demoEvidence;
  try {
    // Every row in `evidence` got there via an admin Approve action — the
    // table itself is the publish gate, verification_status is just a badge.
    const {data, error} = await supabasePublic()
      .from('evidence')
      .select('*, tags:evidence_tags(tag:tags(name))')
      .order('created_at', {ascending: false});
    if (error || !data) return demoEvidence;
    return data.length ? data.map(rowToEvidence) : demoEvidence;
  } catch {
    return demoEvidence;
  }
}

export async function getEvidenceBySlug(slug: string): Promise<Evidence | undefined> {
  if (!supabasePublicConfigured) return demoEvidence.find(e => e.slug === slug);
  try {
    const {data, error} = await supabasePublic()
      .from('evidence')
      .select('*, tags:evidence_tags(tag:tags(name))')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return demoEvidence.find(e => e.slug === slug);
    return rowToEvidence(data);
  } catch {
    return demoEvidence.find(e => e.slug === slug);
  }
}
