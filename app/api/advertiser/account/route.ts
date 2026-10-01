import {NextRequest,NextResponse} from 'next/server';
import {getAdvertiserContext} from '@/lib/advertiser-auth';
import {supabaseAdmin} from '@/lib/supabase/server';

export async function GET(req:NextRequest){
  const {account,error}=await getAdvertiserContext(req);
  if(error||!account)return NextResponse.json({error:error||'Unauthorized'},{status:401});
  const admin=supabaseAdmin();
  const {data:ads,error:adsError}=await admin.from('ad_requests').select('*').eq('advertiser_account_id',account.id).order('created_at',{ascending:false});
  if(adsError)return NextResponse.json({error:adsError.message},{status:500});
  const ids=(ads??[]).map(a=>a.id);
  const {data:events}=ids.length?await admin.from('ad_events').select('ad_id,event_type,created_at').in('ad_id',ids):{data:[]};
  const analytics=new Map<string,{impressions:number;clicks:number}>();
  for(const event of events??[]){const x=analytics.get(event.ad_id)||{impressions:0,clicks:0};event.event_type==='click'?x.clicks++:x.impressions++;analytics.set(event.ad_id,x)}
  return NextResponse.json({account,ads:(ads??[]).map(ad=>{const a=analytics.get(ad.id)||{impressions:0,clicks:0};return {...ad,analytics:{...a,ctr:a.impressions?(a.clicks/a.impressions)*100:0}}})});
}

export async function PATCH(req:NextRequest){
  const {account,error}=await getAdvertiserContext(req);
  if(error||!account)return NextResponse.json({error:error||'Unauthorized'},{status:401});
  if(account.status!=='approved')return NextResponse.json({error:'Your premium account is awaiting admin approval.'},{status:403});
  const body=await req.json().catch(()=>({}));
  const id=String(body.id||'');if(!id)return NextResponse.json({error:'Advert id is required.'},{status:400});
  const admin=supabaseAdmin();
  const {data:current,error:findError}=await admin.from('ad_requests').select('id').eq('id',id).eq('advertiser_account_id',account.id).single();
  if(findError||!current)return NextResponse.json({error:'Advert not found.'},{status:404});
  const patch:Record<string,unknown>={};
  for(const key of ['title','description','target_url','media_url','contact_email','contact_whatsapp'])if(body[key]!==undefined)patch[key]=body[key]===''?null:String(body[key]);
  if(patch.title!==undefined&&!String(patch.title).trim())return NextResponse.json({error:'Title is required.'},{status:400});
  if(patch.target_url!==undefined){try{const u=new URL(String(patch.target_url));if(!['http:','https:'].includes(u.protocol))throw new Error()}catch{return NextResponse.json({error:'Destination URL must be valid.'},{status:400})}}
  if(patch.media_url){try{const u=new URL(String(patch.media_url));if(!['http:','https:'].includes(u.protocol))throw new Error()}catch{return NextResponse.json({error:'Media URL must be valid.'},{status:400})}}
  const {data:ad,error:updateError}=await admin.from('ad_requests').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();
  if(updateError)return NextResponse.json({error:updateError.message},{status:500});
  return NextResponse.json({ok:true,ad});
}
