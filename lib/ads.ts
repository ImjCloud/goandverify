import {supabasePublicConfigured, supabasePublic} from './supabase/server';

export type ApprovedAd = {
  id: string;
  title: string;
  description: string;
  media_type: 'image' | 'video' | 'link';
  media_url: string | null;
  paused_at?: string | null;
  image_url: string | null;
  target_url: string;
  advertiser_name: string;
};

export async function getApprovedAds(): Promise<ApprovedAd[]> {
  if (!supabasePublicConfigured) return [];
  try {
    const {data, error} = await supabasePublic()
      .from('ad_requests')
      .select('id,title,description,media_type,media_url,image_url,target_url,advertiser_name,paused_at')
      .eq('status', 'approved')
      .is('paused_at', null)
      .order('created_at', {ascending: false});
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}