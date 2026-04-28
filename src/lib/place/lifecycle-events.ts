import { query } from '../postgres';

export type PlaceLifecycleEventInput = {
  placeId: string;
  fromStatus: string | null;
  toStatus: string;
  actorUserId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordPlaceLifecycleEvent(input: PlaceLifecycleEventInput): Promise<void> {
  await query(
    `INSERT INTO place_lifecycle_events (
      place_id, from_status, to_status, actor_user_id, reason, metadata, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
    [
      input.placeId,
      input.fromStatus,
      input.toStatus,
      input.actorUserId || null,
      input.reason || null,
      JSON.stringify(input.metadata || {}),
    ],
  );
}

export function getPendingSlaHours(): number {
  const raw = Number(process.env.PLACE_PENDING_SLA_HOURS || 48);
  if (!Number.isFinite(raw)) return 48;
  return Math.max(1, Math.min(720, raw));
}

