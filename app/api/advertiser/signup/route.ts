import {NextRequest, NextResponse} from 'next/server';
import {supabaseConfigured,supabaseAdmin} from '@/lib/supabase/server';
import {checkRateLimit,getClientIp} from '@/lib/rateLimit';

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
  if(!email||!/^\S+@\S+\.\S+$/.test(email)||password.length<8||!advertiserName)return NextResponse.json({error:'Complete the required account information.'},{status:400});
  if(!contactWhatsapp&&!contactEmail)return NextResponse.json({error:'Provide a contact email or WhatsApp number.'},{status:400});
  const admin=supabaseAdmin();
  const {data:userData,error:userError}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  if(userError||!userData.user)return NextResponse.json({error:userError?.message||'Could not create advertiser account.'},{status:400});
  const {data:account,error:accountError}=await admin.from('advertiser_accounts').insert({auth_user_id:userData.user.id,email,advertiser_name:advertiserName,contact_email:contactEmail||null,contact_whatsapp:contactWhatsapp||null,plan:'premium',status:'pending',max_posts:3}).select('*').single();
  if(accountError||!account){await admin.auth.admin.deleteUser(userData.user.id);return NextResponse.json({error:'Could not create the advertiser profile.'},{status:500});}
  return NextResponse.json({ok:true,email,accountId:account.id,message:'Account created and submitted for admin approval.'});
}
