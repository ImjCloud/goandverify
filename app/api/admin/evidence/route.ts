import {NextRequest, NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});
  const {data, error} = await supabaseAdmin().from('evidence').select('id,slug,title,description,event_date,location_city,source_name,source_url,media_url,thumbnail_url,verification_status,event_category,about_person,uploader_name,created_at,updated_at').order('created_at', {ascending: false});
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({evidence: data ?? []});
}
