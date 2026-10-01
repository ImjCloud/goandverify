'use client';
import {useEffect} from 'react';
import {supabaseBrowser} from '@/lib/supabase/client';

export function RecoveryRedirect(){
  useEffect(()=>{
    const supabase=supabaseBrowser();
    const hash=window.location.hash;
    const type=new URLSearchParams(hash.replace(/^#/,'')).get('type');
    const hasRecoveryToken=Boolean(new URLSearchParams(hash.replace(/^#/,'')).get('access_token'));
    if(type==='recovery'||hasRecoveryToken){
      window.location.replace(`/advertise/premium/reset-password${hash}`);
      return;
    }
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY'){
        const recoveryHash=window.location.hash;
        window.location.replace(`/advertise/premium/reset-password${recoveryHash}`);
      }
    });
    return()=>subscription.unsubscribe();
  },[]);
  return null;
}