import {supabasePublicConfigured, supabasePublic} from './supabase/server';

export type CampaignEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  media_type: 'image' | 'video' | 'none';
  media_url: string | null;
  image_url: string | null;
  href: string | null;
  created_at: string;
};

export async function getCampaignEvents(limit = 6): Promise<CampaignEvent[]> {
  if (!supabasePublicConfigured) return [];
  try {
    const {data, error} = await supabasePublic()
      .from('campaign_events')
      .select('id,title,description,event_date,location,media_type,media_url,image_url,href,created_at')
      .order('event_date', {ascending: false, nullsFirst: false})
      .order('created_at', {ascending: false})
      .limit(limit);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
