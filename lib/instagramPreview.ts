import {safeFetch} from '@/lib/linkPreview';

const INSTAGRAM_RESERVED = ['p','reel','reels','tv','stories','explore','accounts'];

function normalizeInstagram(rawUrl:string): {url:string; first:string|null} | null {
  try {
    const url=new URL(rawUrl);
    const host=url.hostname.replace(/^www\./,'').replace(/^m\./,'').toLowerCase();
    if(host!=='instagram.com') return null;
    const parts=url.pathname.split('/').filter(Boolean);
    return {url:url.toString(), first:parts[0]||null};
  } catch { return null; }
}

export function getInstagramUsername(rawUrl:string): string | null {
  const parsed=normalizeInstagram(rawUrl);
  const first=parsed?.first;
  if(!first || INSTAGRAM_RESERVED.includes(first.toLowerCase())) return null;
  return first.replace(/[^a-zA-Z0-9._]/g,'')||null;
}

function extractMeta(html:string, property:string):string|null {
  return html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,'i'))?.[1] ?? null;
}

function decode(value:string):string {
  return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x([0-9a-fA-F]+);/g,(_,h)=>String.fromCodePoint(parseInt(h,16)));
}

async function fetchInstagramPage(rawUrl:string):Promise<{image:string|null;video:string|null}> {
  const response=await safeFetch(rawUrl,{
    signal:AbortSignal.timeout(7000),
    headers:{'User-Agent':'Mozilla/5.0 (compatible; GoAndVerifyAdPreview/1.0)','Accept':'text/html,application/xhtml+xml'},
  });
  if(!response.ok) return {image:null,video:null};
  const html=await response.text();
  const image=extractMeta(html,'og:image');
  const video=extractMeta(html,'og:video');
  return {image:image?decode(image):null,video:video?decode(video):null};
}

/**
 * Preview priority for Instagram adverts:
 * 1. If the supplied URL is a public post/reel/media page, use that page's
 *    own og:image/og:video thumbnail.
 * 2. If the URL is only a profile link, use the profile picture.
 * 3. If the post has no direct image/media metadata, fall back to the
 *    profile picture where the username can be determined.
 */
export async function getInstagramThumbnail(rawUrl:string):Promise<string|null> {
  const parsed=normalizeInstagram(rawUrl);
  if(!parsed) return null;

  try {
    const page=await fetchInstagramPage(parsed.url);
    if(page.image) return page.image;
    if(page.video) return page.video;
  } catch {}

  const username=getInstagramUsername(rawUrl);
  if(!username) return null;
  const profileUrl=`https://www.instagram.com/${encodeURIComponent(username)}/`;

  try {
    const page=await fetchInstagramPage(profileUrl);
    if(page.image) return page.image;
  } catch {}

  try {
    const endpoint=`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const response=await safeFetch(endpoint,{
      signal:AbortSignal.timeout(6000),
      headers:{
        'User-Agent':'Mozilla/5.0 (compatible; GoAndVerifyAdPreview/1.0)',
        'Accept':'application/json',
        'X-IG-App-ID':'936619743392459',
      },
    });
    if(response.ok){
      const data=await response.json();
      return data?.data?.user?.profile_pic_url_hd ?? data?.data?.user?.profile_pic_url ?? null;
    }
  } catch {}
  return null;
}
