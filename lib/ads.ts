import {supabasePublicConfigured, supabasePublic} from './supabase/server';

export type ApprovedAd = {
  id:string; title:string; description:string; media_type:'image'|'video'|'link'; media_url:string|null; paused_at?:string|null; start_date?:string|null; end_date?:string|null; image_url:string|null; target_url:string; advertiser_name:string; contact_email:string|null; contact_whatsapp:string|null; plan?:'free'|'premium'; advertiser_account_id?:string|null; created_at?:string;
};

export async function getApprovedAds():Promise<ApprovedAd[]>{
  if(!supabasePublicConfigured)return[];
  try{
    const settings=await supabasePublic().from('ad_system_settings').select('ads_enabled').eq('id',true).maybeSingle();
    if(settings.data?.ads_enabled===false)return[];
    const{data,error}=await supabasePublic().from('ad_requests').select('id,title,description,media_type,media_url,image_url,target_url,advertiser_name,contact_email,contact_whatsapp,paused_at,start_date,end_date,plan,advertiser_account_id,created_at').eq('status','approved').is('paused_at',null).order('created_at',{ascending:false});
    if(error||!data)return[];
    const now=new Date();
    const active=data.filter(ad=>{const start=ad.start_date?new Date(`${ad.start_date}T00:00:00Z`):null;const end=ad.end_date?new Date(`${ad.end_date}T23:59:59Z`):null;return(!start||now>=start)&&(!end||now<=end)}) as ApprovedAd[];
    const premium=active.filter(ad=>ad.plan==='premium');
    const free=active.filter(ad=>ad.plan!=='premium');
    const queues=new Map<string,ApprovedAd[]>();
    for(const ad of premium){const key=ad.advertiser_account_id||`ad:${ad.id}`;const queue=queues.get(key)||[];queue.push(ad);queues.set(key,queue)}
    const premiumFair:ApprovedAd[]=[];
    while(queues.size){for(const[key,queue] of Array.from(queues.entries())){const next=queue.shift();if(next)premiumFair.push(next);if(!queue.length)queues.delete(key)}}
    return [...premiumFair,...free];
  }catch{return[]}
}
