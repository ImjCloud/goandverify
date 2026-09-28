import {NextRequest, NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabaseConfigured, supabaseAdmin} from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!supabaseConfigured) return NextResponse.json({error: 'Supabase is not configured.'}, {status: 503});

  const admin = supabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-uploads';
  const category = req.nextUrl.searchParams.get('category');
  let query = admin.from('submissions').select('*').order('created_at', {ascending: false});
  if (category === 'campaign_activity' || category === 'historical_event') {
    query = query.eq('event_category', category);
  }
  const {data, error} = await query;
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  const submissions = (data ?? []).map(row => {
    const storageUrl = row.media_path ? admin.storage.from(bucket).getPublicUrl(row.media_path).data.publicUrl : null;
    const mediaUrl = storageUrl ?? row.media_url ?? null;
    return {
      ...row,
      mediaUrl,
      thumbnailUrl: row.thumbnail_url ?? storageUrl ?? null,
      isLink: !row.media_path && !!row.media_url,
    };
  });
  return NextResponse.json({submissions});
}
