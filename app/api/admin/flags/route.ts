import {NextRequest, NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});

  const admin = supabaseAdmin();
  const {data, error} = await admin
    .from('flags')
    .select('*, evidence(id, title, slug)')
    .order('created_at', {ascending: false});
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  return NextResponse.json({flags: data ?? []});
}
