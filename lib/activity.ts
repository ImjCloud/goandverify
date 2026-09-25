import {supabasePublicConfigured, supabasePublic} from './supabase/server';

export type ActivityEvent = {
  id: string;
  event_type: 'evidence_published' | 'correction_resolved' | 'advert_published';
  title: string;
  description: string | null;
  href: string | null;
  created_at: string;
};

export async function getRecentActivity(limit = 6): Promise<ActivityEvent[]> {
  if (!supabasePublicConfigured) return [];
  try {
    const {data, error} = await supabasePublic().from('activity_events').select('id,event_type,title,description,href,created_at').order('created_at', {ascending: false}).limit(limit);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
