import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {getAdvertiserContext} from '@/lib/advertiser-auth';
import {supabaseAdmin} from '@/lib/supabase/server';
const images:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'};
const videos:Record<string,string>={mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/mp4'};
export async function POST(req:NextRequest){
 const {account,error}=await getAdvertiserContext(req);if(error||!account)return NextResponse.json({error:error||'Unauthorized'},{status:401});if(account.status!=='approved')return NextResponse.json({error:'Account approval required.'},{status:403});
 const form=await req.formData();const id=String(form.get('id')||'');const raw=form.get('file');const file=raw instanceof File&&raw.size>0?raw:null;if(!id||!file)return NextResponse.json({error:'Advert and file are required.'},{status:400});if(file.size>30*1024*1024)return NextResponse.json({error:'Media must be 30MB or smaller.'},{status:400});
 const ext=(file.name.split('.').pop()||'').toLowerCase();const type=file.type.startsWith('image/')&&images[ext]?'image':file.type.startsWith('video/')&&videos[ext]?'video':null;if(!type)return NextResponse.json({error:'Use JPG, PNG, WebP, GIF, AVIF, MP4, WebM, MOV or M4V.'},{status:400});
 const admin=supabaseAdmin();const {data:current,error:findError}=await admin.from('ad_requests').select('id,media_path').eq('id',id).eq('advertiser_account_id',account.id).single();if(findError||!current)return NextResponse.json({error:'Advert not found.'},{status:404});
 const bucket=process.env.SUPABASE_STORAGE_BUCKET||'evidence-uploads';const path=`adverts/${randomUUID()}.${ext}`;const up=await admin.storage.from(bucket).upload(path,new Uint8Array(await file.arrayBuffer()),{contentType:file.type,cacheControl:'3600'});if(up.error)return NextResponse.json({error:'Could not upload media.'},{status:500});const url=admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
 const patch=type==='image'?{media_type:'image',media_url:url,image_url:url,media_path:path,status:'pending',updated_at:new Date().toISOString()}:{media_type:'video',media_url:url,image_url:null,media_path:path,status:'pending',updated_at:new Date().toISOString()};const {data:ad,error:updateError}=await admin.from('ad_requests').update(patch).eq('id',id).select('*').single();if(updateError){await admin.storage.from(bucket).remove([path]);return NextResponse.json({error:'Could not update advert media.'},{status:500});}if(current.media_path)await admin.storage.from(bucket).remove([current.media_path]).catch(()=>{});return NextResponse.json({ok:true,ad});
}
