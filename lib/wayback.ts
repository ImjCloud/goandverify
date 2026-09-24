/**
 * Best-effort Wayback Machine archiving via the free, unauthenticated Save
 * Page Now endpoint. This is fire-and-forget: archive.org's anonymous save
 * endpoint is rate-limited and can be slow or occasionally unavailable, so a
 * failure here must never block or fail the evidence-approval action itself.
 *
 * For reliable, higher-volume archiving, register for a free Internet
 * Archive API key (https://archive.org/account/s3.php) and switch this to
 * SPN2 (https://docs.google.com/document/d/1Nsv52MvSjbLb2PCpHlat0gkzw0EvtSgpKHu4mk0MnrA)
 * with an Authorization: LOW <access>:<secret> header.
 */
export async function archiveUrl(url: string): Promise<string | null> {
  if (!url || url === '#') return null;
  try {
    const saveUrl = `https://web.archive.org/save/${url}`;
    const res = await fetch(saveUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: {'User-Agent': 'Mozilla/5.0 (compatible; EvidenceGalleryArchiver/1.0)'},
    });
    // The Save Page Now endpoint redirects to the snapshot's final URL on success.
    if (res.ok || res.status === 200) {
      return res.url && res.url !== saveUrl ? res.url : `https://web.archive.org/web/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}000000*/${url}`;
    }
    return null;
  } catch {
    return null;
  }
}
