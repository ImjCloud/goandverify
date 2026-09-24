import {supabaseConfigured, supabaseAdmin} from './supabase/server';

/**
 * Best-effort audit logging. Never throws — a logging failure should never
 * break the actual moderation action it's trying to record.
 */
export async function logAudit(action: string, entityType: string, entityId: string | null, details?: Record<string, unknown>) {
  if (!supabaseConfigured) return;
  try {
    await supabaseAdmin()
      .from('audit_logs')
      .insert({action, entity_type: entityType, entity_id: entityId, details: details ?? null});
  } catch {
    /* logging must never break the caller */
  }
}
