import {NextRequest} from 'next/server';

export function advertiserLoginUrl(req:NextRequest){
  const base=(process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin).replace(/\/$/,'');
  return base+'/advertise/premium/login';
}

function escapeHtml(value:string){
  return value.replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
}

export function advertiserWhatsAppUrl(phone:string,name:string,email:string,url:string){
  const digits=phone.replace(/\D/g,'');
  if(!digits)return null;
  const message='Hello '+name+', your GoAndVerify Premium Advertising account has been approved.\n\nLogin page: '+url+'\nAccount email: '+email+'\n\nPlease use the password you created during signup. Do not share your password with anyone.';
  return 'https://wa.me/'+digits+'?text='+encodeURIComponent(message);
}

export async function sendAdvertiserApprovalEmail(to:string,name:string,email:string,url:string){
  const key=process.env.RESEND_API_KEY;
  const from=process.env.NOTIFICATION_FROM_EMAIL;
  if(!key||!from)return {sent:false,reason:'Email delivery is not configured.'};
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
    body:JSON.stringify({
      from,
      to:[to],
      subject:'Your GoAndVerify Premium Advertising account is approved',
      html:'<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Premium advertising account approved</h2><p>Hello '+escapeHtml(name)+',</p><p>Your GoAndVerify Premium Advertising account has been approved.</p><p><strong>Account email:</strong> '+escapeHtml(email)+'</p><p><a href="'+url+'" style="display:inline-block;padding:12px 18px;background:#d6b56b;color:#15130f;text-decoration:none;border-radius:999px;font-weight:700">Open Advertiser Login</a></p><p>Use the password you created during signup. Never send your password by email or WhatsApp.</p></div>'
    })
  });
  if(!response.ok)return {sent:false,reason:'Email provider rejected the message.'};
  return {sent:true};
}