'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Loader2,LogIn,KeyRound} from 'lucide-react';
import {supabaseBrowser} from '@/lib/supabase/client';

export default function PremiumLogin(){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[resetBusy,setResetBusy]=useState(false);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');setNotice('');
    const f=new FormData(e.currentTarget);
    try{
      const{error}=await supabaseBrowser().auth.signInWithPassword({
        email:String(f.get('email')).trim(),
        password:String(f.get('password'))
      });
      if(error)throw error;
      router.push('/advertiser/dashboard');
    }catch(x:any){setError(x.message||'Could not sign in.')}
    finally{setBusy(false)}
  }

  async function resetPassword(){
    setResetBusy(true);setError('');setNotice('');
    const email=window.prompt('Enter the account email used for your Premium Advertiser account:')?.trim();
    if(!email){setResetBusy(false);return}
    try{
      const redirectTo=`${window.location.origin}/advertise/premium/reset-password`;
      const{error}=await supabaseBrowser().auth.resetPasswordForEmail(email,{redirectTo});
      if(error)throw error;
      setNotice('If that email is registered, a password reset link has been sent. Check the inbox and follow the link to choose a new password.');
    }catch(x:any){setError(x.message||'Could not send the password reset email.')}
    finally{setResetBusy(false)}
  }

  return <main className="mx-auto max-w-xl px-5 py-24">
    <div className="flex items-center gap-3 text-[var(--accent)]"><LogIn size={20}/><p className="eyebrow text-[var(--accent)]">Premium Advertiser</p></div>
    <h1 className="editorial-serif mt-3 text-6xl">Sign in.</h1>
    {error&&<p role="alert" className="mt-6 border border-red-900/50 bg-red-950/40 px-5 py-4 text-sm text-red-300">{error}</p>}
    {notice&&<p role="status" className="mt-6 border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-5 py-4 text-sm">{notice}</p>}
    <form onSubmit={submit} className="mt-10 grid gap-5">
      <label className="grid gap-2 text-sm font-semibold">Email<input name="email" type="email" required autoComplete="email" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label>
      <label className="grid gap-2 text-sm font-semibold">Password<input name="password" type="password" required autoComplete="current-password" className="border border-white/15 bg-[var(--surface)] px-4 py-3"/></label>
      <button disabled={busy||resetBusy} className="action-animated inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-4 text-sm font-bold text-[#15130f]">{busy&&<Loader2 size={16} className="animate-spin"/>}Sign in</button>
      <button type="button" onClick={resetPassword} disabled={busy||resetBusy} className="action-animated inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-4 text-sm font-bold">{resetBusy?<Loader2 size={16} className="animate-spin"/>:<KeyRound size={16}/>} Forgot password?</button>
      <p className="text-sm text-[var(--muted)]">Need an account? <Link href="/advertise/premium/signup" className="font-bold text-[var(--accent)]">Create one</Link></p>
    </form>
  </main>
}