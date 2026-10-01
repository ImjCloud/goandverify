'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {CheckCircle2,Loader2,LockKeyhole} from 'lucide-react';
import {supabaseBrowser} from '@/lib/supabase/client';

export default function PremiumResetPassword(){
  const router=useRouter();
  const[ready,setReady]=useState(false);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');

  useEffect(()=>{
    const supabase=supabaseBrowser();
    let active=true;
    supabase.auth.getSession().then(({data})=>{
      if(active)setReady(Boolean(data.session));
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY'||session)setReady(true);
    });
    return()=>{active=false;subscription.unsubscribe()};
  },[]);

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');setNotice('');
    const f=new FormData(e.currentTarget);
    const password=String(f.get('password'));
    const confirm=String(f.get('confirmPassword'));
    if(password.length<8){setError('Password must be at least 8 characters.');setBusy(false);return}
    if(password!==confirm){setError('Passwords do not match.');setBusy(false);return}
    try{
      const{error}=await supabaseBrowser().auth.updateUser({password});
      if(error)throw error;
      setNotice('Password updated successfully. You can now sign in with your new password.');
      await supabaseBrowser().auth.signOut();
      setTimeout(()=>router.replace('/advertise/premium/login'),900);
    }catch(x:any){setError(x.message||'Could not update your password.')}
    finally{setBusy(false)}
  }

  if(!ready)return <main className="mx-auto max-w-xl px-5 py-24"><div className="flex items-center gap-3 text-[var(--accent)]"><LockKeyhole size={20}/><p className="eyebrow text-[var(--accent)]">Premium Advertiser</p></div><h1 className="editorial-serif mt-3 text-5xl">Reset password.</h1><p className="mt-5 text-[var(--muted)]">Checking your secure recovery session…</p></main>;

  return <main className="mx-auto max-w-xl px-5 py-24">
    <div className="flex items-center gap-3 text-[var(--accent)]"><LockKeyhole size={20}/><p className="eyebrow text-[var(--accent)]">Premium Advertiser</p></div>
    <h1 className="editorial-serif mt-3 text-6xl">Choose a new password.</h1>
    {error&&<p role="alert" className="mt-6 border border-red-900/50 bg-red-950/40 px-5 py-4 text-sm text-red-300">{error}</p>}
    {notice&&<p role="status" className="mt-6 flex items-center gap-2 border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-5 py-4 text-sm"><CheckCircle2 size={17}/> {notice}</p>}
    <form onSubmit={submit} className="mt-10 grid gap-5">
      <label className="grid gap-2 text-sm font-semibold">New password<input name="password" type="password" required minLength={8} autoComplete="new-password" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label>
      <label className="grid gap-2 text-sm font-semibold">Confirm new password<input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label>
      <button disabled={busy} className="action-animated inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-4 text-sm font-bold text-[#15130f]">{busy&&<Loader2 size={16} className="animate-spin"/>}Update password</button>
      <Link href="/advertise/premium/login" className="text-center text-sm font-bold text-[var(--accent)]">Back to premium login</Link>
    </form>
  </main>
}