import {NextRequest,NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured,supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';

export async function GET(req:NextRequest){
  if(!isAdminRequest(req))return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!supabaseConfigured)return NextResponse.json({error:'Supabase is not configured.'},{status:503});
  const {data,error}=await supabaseAdmin().from('ad_system_settings').select('ads_enabled,updated_at').eq('id',true).single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({adsEnabled:data.ads_enabled,updatedAt:data.updated_at});
}

export async function PATCH(req:NextRequest){
  if(!isAdminRequest(req))return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!supabaseConfigured)return NextResponse.json({error:'Supabase is not configured.'},{status:503});
  const body=await req.json().catch(()=>({}));
  if(typeof body.adsEnabled!=='boolean')return NextResponse.json({error:'adsEnabled must be true or false.'},{status:400});
  const admin=supabaseAdmin();
  const {data,error}=await admin.from('ad_system_settings').update({ads_enabled:body.adsEnabled,updated_at:new Date().toISOString()}).eq('id',true).select('ads_enabled,updated_at').single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  await logAudit(body.adsEnabled?'ads_emergency_enabled':'ads_emergency_disabled','ad_system_settings','global',{adsEnabled:body.adsEnabled});
  return NextResponse.json({ok:true,adsEnabled:data.ads_enabled,updatedAt:data.updated_at});
}
