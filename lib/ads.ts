import {supabasePublicConfigured, supabasePublic} from './supabase/server';

export type ApprovedAd = {
  id:string; title:string; description:string; media_type:'image'|'video'|'link'; media_url:string|null; paused_at?:string|null; start_date?:string|null; end_date?:string|null; image_url:string|null; target_url:string; advertiser_name:string; contact_email:string|null; contact_whatsapp:string|null; plan?:'free'|'premium'; created_at?:string;
};

export async function getApprovedAds():Promise<ApprovedAd[]>{if(!supabasePublicConfigured)return[];try{const{data,error}=await supabasePublic().from('ad_requests').select('id,title,description,media_type,media_url,image_url,target_url,advertiser_name,contact_email,contact_whatsapp,paused_at,start_date,end_date,plan,created_at').eq('status','approved').is('paused_at',null).order('plan',{ascending:false}).order('created_at',{ascending:false});if(error||!data)return[];const now=new Date();return data.filter(ad=>{const start=ad.start_date?new Date(`${ad.start_date}T00:00:00Z`):null;const end=ad.end_date?new Date(`${ad.end_date}T23:59:59Z`):null;return(!start||now>=start)&&(!end||now<=end)}) as ApprovedAd[]}catch{return[]}}
