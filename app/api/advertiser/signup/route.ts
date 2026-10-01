import {NextRequest, NextResponse} from 'next/server';
import {supabaseConfigured,supabaseAdmin} from '@/lib/supabase/server';
import {checkRateLimit,getClientIp} from '@/lib/rateLimit';

function validUrl(value:string){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)}catch{return false}}

export async function POST(req:NextRequest){
  if(!supabaseConfigured)return NextResponse.json({error:'Advertising accounts are not configured yet.'},{status:503});
  const rate=await checkRateLimit(`premium-signup:${getClientIp(req)}`,3,3600);
  if(!rate.allowed)return NextResponse.json({error:'Too many signup attempts from this network. Please try again later.'},{status:429});
  const body=await req.json().catch(()=>({}));
  const email=String(body.email??'').trim().toLowerCase();
  const password=String(body.password??'');
  const advertiserName=String(body.advertiserName??'').trim();
  const contactWhatsapp=String(body.contactWhatsapp??'').trim();
  const contactEmail=String(body.contactEmail??email).trim().toLowerCase();
  const title=String(body.title??'').trim();
  const description=String(body.description??'').trim();
  const targetUrl=String(body.targetUrl??'').trim();
  const mediaUrl=String(body.mediaUrl??'').trim();
  if(!email||!/^\S+@\S+\.\S+$/.test(email)||password.length<8||!advertiserName||!title||!description||!targetUrl)return NextResponse.json({error:'Complete all required account and first-advert fields.'},{status:400});
  if(!validUrl(targetUrl)||(mediaUrl&&!validUrl(mediaUrl)))return NextResponse.json({error:'Destination and media links must use http or https.'},{status:400});
  if(!contactWhatsapp&&!contactEmail)return NextResponse.json({error:'Provide a contact email or WhatsApp number.'},{status:400});
  const admin=supabaseAdmin();
  const {data:userData,error:userError}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  if(userError||!userData.user)return NextResponse.json({error:userError?.message||'Could not create advertiser account.'},{status:400});
  const {data:account,error:accountError}=await admin.from('advertiser_accounts').insert({auth_user_id:userData.user.id,email,advertiser_name:advertiserName,contact_email:contactEmail||null,contact_whatsapp:contactWhatsapp||null,plan:'premium',status:'pending',max_posts:3}).select('*').single();
  if(accountError||!account){await admin.auth.admin.deleteUser(userData.user.id);return NextResponse.json({error:'Could not create the advertiser profile.'},{status:500});}
  const {error:adError}=await admin.from('ad_requests').insert({advertiser_account_id:account.id,plan:'premium',advertiser_name:advertiserName,contact_email:contactEmail||null,contact_whatsapp:contactWhatsapp||null,title,description,media_type:mediaUrl?'link':'link',media_url:mediaUrl||null,image_url:null,target_url:targetUrl,rights_confirmed:true,status:'pending'});
  if(adError){await admin.from('advertiser_accounts').delete().eq('id',account.id);await admin.auth.admin.deleteUser(userData.user.id);return NextResponse.json({error:'Could not save the first premium advert.'},{status:500});}
  return NextResponse.json({ok:true,email,message:'Account created. It is pending admin approval.'});
}
