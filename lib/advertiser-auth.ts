import type {NextRequest} from 'next/server';
import {supabaseConfigured,supabaseAdmin} from '@/lib/supabase/server';

export async function getAdvertiserContext(req: NextRequest) {
  if (!supabaseConfigured) return {user: null, account: null, error: 'Supabase is not configured.'};
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return {user: null, account: null, error: 'Authentication required.'};
  const admin = supabaseAdmin();
  const {data: userData, error: userError} = await admin.auth.getUser(token);
  if (userError || !userData.user) return {user: null, account: null, error: 'Invalid or expired session.'};
  const {data: account, error: accountError} = await admin.from('advertiser_accounts').select('*').eq('auth_user_id', userData.user.id).maybeSingle();
  if (accountError) return {user: userData.user, account: null, error: accountError.message};
  if (!account) return {user: userData.user, account: null, error: 'Advertiser account not found.'};
  if (account.status === 'deleted') return {user: userData.user, account: null, error: 'This advertiser account has been deleted by an administrator.'};
  return {user: userData.user, account, error: null};
}
