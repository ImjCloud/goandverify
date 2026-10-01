import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {getAdvertiserContext} from '@/lib/advertiser-auth';
import {supabaseAdmin} from '@/lib/supabase/server';
import {getInstagramThumbnail} from '@/lib/instagramPreview';
import {getLinkPreview} from '@/lib/linkPreview';

const imageMimes:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'};
const videoMimes:Record<string,string>={mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/mp4'};
function validUrl(value:string){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)}catch{return false}}

export async function POST(req:NextRequest){
  const {account,error}=await getAdvertiserContext(req);if(error||!account)return NextResponse.json({error:error||'Unauthorized'},{status:401});
  if(account.status!=='approved')return NextResponse.json({error:'Your account must be approved before you can manage adverts.'},{status:403});
  const admin=supabaseAdmin(); const {count}=await admin.from('ad_requests').select('id',{count:'exact',head:true}).eq('advertiser_account_id',account.id); if((count??0)>=3)return NextResponse.json({error:'Premium accounts can have a maximum of 3 adverts.'},{status:400});
  const form=await req.formData();const title=String(form.get('title')??'').trim();const description=String(form.get('description')??'').trim();const targetUrl=String(form.get('targetUrl')??'').trim();const mediaUrl=String(form.get('mediaUrl')??'').trim();
  if(!title||!description||!targetUrl||!validUrl(targetUrl)||(mediaUrl&&!validUrl(mediaUrl)))return NextResponse.json({error:'Provide a title, description and valid destination link.'},{status:400});
  const raw=form.get('mediaFile');const file=raw instanceof File&&raw.size>0?raw:null;let storedMediaUrl=mediaUrl||null;let imageUrl:string|null=null;let mediaPath:string|null=null;let mediaType:'image'|'video'|'link'='link';
  if(file){if(file.size>30*1024*1024)return NextResponse.json({error:'Media must be 30MB or smaller.'},{status:400});const ext=(file.name.split('.').pop()||'').toLowerCase();if(file.type.startsWith('image/')&&imageMimes[ext])mediaType='image';else if(file.type.startsWith('video/')&&videoMimes[ext])mediaType='video';else return NextResponse.json({error:'Use JPG, PNG, WebP, GIF, AVIF, MP4, WebM, MOV or M4V.'},{status:400});const bucket=process.env.SUPABASE_STORAGE_BUCKET||'evidence-uploads';mediaPath=`adverts/${randomUUID()}.${ext}`;const up=await admin.storage.from(bucket).upload(mediaPath,new Uint8Array(await file.arrayBuffer()),{contentType:file.type,cacheControl:'3600'});if(up.error)return NextResponse.json({error:'Could not upload media.'},{status:500});storedMediaUrl=admin.storage.from(bucket).getPublicUrl(mediaPath).data.publicUrl;if(mediaType==='image')imageUrl=storedMediaUrl;}
  else if(mediaType==='link'){
    try{const instagramThumb=await getInstagramThumbnail(mediaUrl||targetUrl);if(instagramThumb)imageUrl=instagramThumb;else{const preview=await getLinkPreview(mediaUrl||targetUrl);if(preview.thumbnailUrl)imageUrl=preview.thumbnailUrl;}}catch{try{const preview=await getLinkPreview(mediaUrl||targetUrl);if(preview.thumbnailUrl)imageUrl=preview.thumbnailUrl;}catch{}}
  }
  const {data:ad,error:insertError}=await admin.from('ad_requests').insert({advertiser_account_id:account.id,plan:'premium',advertiser_name:account.advertiser_name,contact_email:account.contact_email,contact_whatsapp:account.contact_whatsapp,title,description,media_type:mediaType,media_url:storedMediaUrl,media_path:mediaPath,image_url:imageUrl,target_url:targetUrl,rights_confirmed:true,status:'approved'}).select('*').single();
  if(insertError){if(mediaPath)await admin.storage.from(process.env.SUPABASE_STORAGE_BUCKET||'evidence-uploads').remove([mediaPath]);return NextResponse.json({error:insertError.message},{status:500});}return NextResponse.json({ok:true,ad});
}

export async function PATCH(req:NextRequest){
  const {account,error}=await getAdvertiserContext(req);if(error||!account)return NextResponse.json({error:error||'Unauthorized'},{status:401});if(account.status!=='approved')return NextResponse.json({error:'Account approval required.'},{status:403});
  const body=await req.json().catch(()=>({}));const id=String(body.id||'');if(!id)return NextResponse.json({error:'Advert id is required.'},{status:400});const admin=supabaseAdmin();const {data:ad}=await admin.from('ad_requests').select('*').eq('id',id).eq('advertiser_account_id',account.id).maybeSingle();if(!ad)return NextResponse.json({error:'Advert not found.'},{status:404});
  const patch:Record<string,unknown>={};for(const key of ['title','description','target_url','media_url'])if(body[key]!==undefined)patch[key]=body[key];if(patch.target_url&&!validUrl(String(patch.target_url)))return NextResponse.json({error:'Destination URL must be valid.'},{status:400});
  if(typeof patch.media_url==='string'&&patch.media_url){try{const instagramThumb=await getInstagramThumbnail(patch.media_url);if(instagramThumb)patch.image_url=instagramThumb;else{const preview=await getLinkPreview(patch.media_url);patch.image_url=preview.thumbnailUrl;}}catch{}}
  const {data:updated,error:updateError}=await admin.from('ad_requests').update({...patch,updated_at:new Date().toISOString(),status:'approved'}).eq('id',id).select('*').single();if(updateError)return NextResponse.json({error:updateError.message},{status:500});return NextResponse.json({ok:true,ad:updated});
}
