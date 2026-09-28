import {NextRequest,NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured,supabaseAdmin} from '@/lib/supabase/server';
import {logAudit} from '@/lib/auditLog';

const editable=['slug','title','type','description','event_date','publication_date','location_city','location_state','location_country','author','source_name','source_url','media_url','thumbnail_url','verification_status','uploader_name','uploader_email','rights','wayback_url','event_category','about_person'] as const;
const evidenceTypes=['image','video','audio','document','statement','interview','event','news'];
const verificationMap:Record<string,string>={'User Submitted':'submitted','Under Review':'under_review','Partially Verified':'partially_verified','Source Verified':'source_verified','Disputed':'disputed','Archived':'archived'};

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!isAdminRequest(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!supabaseConfigured)return NextResponse.json({error:'Supabase is not configured.'},{status:503});
 const {id}=await params;
 const {data,error}=await supabaseAdmin().from('evidence').select('*').eq('id',id).single();
 if(error||!data)return NextResponse.json({error:'Evidence not found.'},{status:404});
 return NextResponse.json({evidence:data});
}

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!isAdminRequest(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!supabaseConfigured)return NextResponse.json({error:'Supabase is not configured.'},{status:503});
 const {id}=await params;
 let body:Record<string,unknown>;
 try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON body.'},{status:400});}

 const admin=supabaseAdmin();
 const {data:current,error:fetchError}=await admin.from('evidence').select('*').eq('id',id).single();
 if(fetchError||!current)return NextResponse.json({error:'Evidence not found.'},{status:404});

 const patch:Record<string,unknown>={};
 for(const key of editable){
  if(Object.prototype.hasOwnProperty.call(body,key)) patch[key]=body[key]===''?null:body[key];
 }
 if(patch.slug!==undefined&&!String(patch.slug??'').trim())return NextResponse.json({error:'Slug is required.'},{status:400});
 if(patch.title!==undefined&&!String(patch.title??'').trim())return NextResponse.json({error:'Title is required.'},{status:400});
 if(patch.description===null)patch.description='';
 if(patch.type!==undefined&&!evidenceTypes.includes(String(patch.type)))return NextResponse.json({error:'Invalid evidence type.'},{status:400});
 if(patch.verification_status!==undefined)patch.verification_status=verificationMap[String(patch.verification_status)]||patch.verification_status;
 patch.updated_at=new Date().toISOString();

 const {data:updated,error}=await admin.from('evidence').update(patch).eq('id',id).select('*').single();
 if(error)return NextResponse.json({error:error.message},{status:500});

 const {data:submission}=await admin.from('submissions').select('id').eq('evidence_id',id).maybeSingle();
 if(submission){
  const submissionPatch:Record<string,unknown>={};
  if(patch.title!==undefined)submissionPatch.title=patch.title;
  if(patch.description!==undefined)submissionPatch.description=patch.description;
  if(patch.event_date!==undefined)submissionPatch.event_date=patch.event_date;
  if(patch.location_city!==undefined)submissionPatch.location=patch.location_city;
  if(patch.source_url!==undefined)submissionPatch.source_url=patch.source_url;
  if(patch.media_url!==undefined)submissionPatch.media_url=patch.media_url;
  if(Object.keys(submissionPatch).length)await admin.from('submissions').update(submissionPatch).eq('id',submission.id);
 }

 await logAudit('evidence_updated','evidence',id,{fields:Object.keys(patch),campaignSync:false});
 return NextResponse.json({ok:true,evidence:updated});
}
