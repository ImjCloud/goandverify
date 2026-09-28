import {NextRequest, NextResponse} from 'next/server';
import {supabasePublicConfigured, supabasePublic} from '@/lib/supabase/server';

type Check = {kind:'image'|'video'|'source'; url:string; ok:boolean; status:number|null; contentType:string|null; reason?:string};

function allowedSource(url:string){
  try {
    const u=new URL(url);
    return ['http:','https:'].includes(u.protocol);
  } catch { return false; }
}

async function checkUrl(url:string, kind:Check['kind']):Promise<Check>{
  if (!allowedSource(url)) return {kind,url,ok:false,status:null,contentType:null,reason:'invalid URL'};
  try {
    const response=await fetch(url,{method:'HEAD',redirect:'follow',cache:'no-store',headers:{'User-Agent':'GoAndVerify-MediaAudit/1.0'}});
    const contentType=response.headers.get('content-type');
    const imageOk=kind!=='image'||!!contentType?.startsWith('image/');
    const videoOk=kind!=='video'||!!contentType?.startsWith('video/');
    return {kind,url,ok:response.ok&&imageOk&&videoOk,status:response.status,contentType,reason:!response.ok?'HTTP error':!imageOk||!videoOk?'unexpected content type':undefined};
  } catch (error) {
    return {kind,url,ok:false,status:null,contentType:null,reason:error instanceof Error?error.message:'request failed'};
  }
}

export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get('token');
  if(process.env.NODE_ENV==='production' && token!==process.env.MEDIA_AUDIT_TOKEN){
    return NextResponse.json({error:'Unauthorized'},{status:401});
  }
  if(!supabasePublicConfigured) return NextResponse.json({error:'Supabase is not configured'},{status:503});

  const supabase=supabasePublic();
  const [{data:evidence,error:evidenceError},{data:campaigns,error:campaignError}]=await Promise.all([
    supabase.from('evidence').select('id,slug,title,type,source_url,media_url,thumbnail_url,verification_status').limit(500),
    supabase.from('campaign_events').select('id,title,media_type,media_url,image_url,status').limit(500),
  ]);
  if(evidenceError||campaignError) return NextResponse.json({error:evidenceError?.message||campaignError?.message},{status:500});

  const checks:Check[]=[];
  for(const row of evidence??[]){
    if(row.thumbnail_url) checks.push(await checkUrl(row.thumbnail_url,'image'));
    if(row.media_url){
      const lower=String(row.media_url).toLowerCase();
      const kind=/\.(mp4|webm|mov|m4v)(?:\?|$)/.test(lower)?'video':'source';
      if(allowedSource(row.media_url)) checks.push(await checkUrl(row.media_url,kind));
    }
    if(row.source_url && row.source_url!=='#' && row.source_url!==row.media_url && allowedSource(row.source_url)) checks.push(await checkUrl(row.source_url,'source'));
  }
  for(const row of campaigns??[]){
    if(row.image_url) checks.push(await checkUrl(row.image_url,'image'));
    if(row.media_url && row.media_type==='video' && allowedSource(row.media_url)) checks.push(await checkUrl(row.media_url,'video'));
  }

  const failed=checks.filter(c=>!c.ok);
  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    summary:{checked:checks.length,passed:checks.length-failed.length,failed:failed.length},
    failures:failed,
    checks,
  },{headers:{'Cache-Control':'no-store'}});
}
