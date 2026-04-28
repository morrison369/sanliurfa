import { query } from '../postgres';
import type { SocialEvent } from './event-stream';

function asUuidOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
}

export async function appendSocialEvent(event: SocialEvent): Promise<void> {
  const params = [
    event.eventType,
    asUuidOrNull(event.actorUserId),
    asUuidOrNull(event.targetUserId),
    asUuidOrNull(event.conversationId),
    JSON.stringify(event.metadata || {}),
    event.createdAt || new Date().toISOString(),
    (event.tenantId || 'default').trim() || 'default',
  ];

  try {
    await query(
      `INSERT INTO social_event_store (
        event_type, actor_user_id, target_user_id, conversation_id, metadata, created_at, tenant_id
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      params,
    );
  } catch {
    // Backward compatibility before migration 148
    await query(
      `INSERT INTO social_event_store (
        event_type, actor_user_id, target_user_id, conversation_id, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      params.slice(0, 6),
    );
  }
}
