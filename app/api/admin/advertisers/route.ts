import {NextRequest,NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured,supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';

export async function GET(req:NextRequest){if(!isAdminRequest(req))return NextResponse.json({error:'Unauthorized'},{status:401});if(!supabaseConfigured)return NextResponse.json({error:'Supabase is not configured.'},{status:503});const admin=supabaseAdmin();const {data,error}=await admin.from('advertiser_accounts').select('*').order('created_at',{ascending:false});if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({accounts:data??[]});}

export async function PATCH(req:NextRequest){
  if(!isAdminRequest(req))return NextResponse.json({error:'Unauthorized'},{status:401});if(!supabaseConfigured)return NextResponse.json({error:'Supabase is not configured.'},{status:503});const body=await req.json().catch(()=>({}));const id=String(body.id||'');const status=['approved','rejected','suspended'].includes(body.status)?body.status:'';if(!id||!status)return NextResponse.json({error:'Account and valid status are required.'},{status:400});const admin=supabaseAdmin();
  const {data,error}=await admin.from('advertiser_accounts').update({status,reviewer_notes:typeof body.notes==='string'?body.notes:null,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).select('*').single();if(error)return NextResponse.json({error:error.message},{status:500});
  if(status==='approved'){
    const {error:adError}=await admin.from('ad_requests').update({status:'approved',updated_at:new Date().toISOString()}).eq('advertiser_account_id',id).eq('plan','premium');
    if(adError)return NextResponse.json({error:adError.message},{status:500});
  }
  await logAudit(`advertiser_account_${status}`,'advertiser_account',id,{});return NextResponse.json({ok:true,account:data});
}

export async function DELETE(req:NextRequest){
  if(!isAdminRequest(req))return NextResponse.json({error:'Unauthorized'},{status:401});if(!supabaseConfigured)return NextResponse.json({error:'Supabase is not configured.'},{status:503});const body=await req.json().catch(()=>({}));const id=String(body.id||'');if(!id)return NextResponse.json({error:'Advertiser account id is required.'},{status:400});const admin=supabaseAdmin();
  const {data:account,error:findError}=await admin.from('advertiser_accounts').select('*').eq('id',id).single();if(findError||!account)return NextResponse.json({error:'Advertiser account not found.'},{status:404});
  const {data,error}=await admin.from('advertiser_accounts').update({status:'deleted',reviewer_notes:'Account deleted by administrator.',reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).select('*').single();if(error)return NextResponse.json({error:error.message},{status:500});
  const {error:adError}=await admin.from('ad_requests').update({status:'rejected',paused_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('advertiser_account_id',id);if(adError)return NextResponse.json({error:adError.message},{status:500});
  await logAudit('advertiser_account_deleted','advertiser_account',id,{});return NextResponse.json({ok:true,account:data});
}
