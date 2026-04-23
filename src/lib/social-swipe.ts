import { query, queryMany, queryOne } from './postgres';

export type SwipeDirection = 'like' | 'pass';

export interface SwipeProfileInput {
  bio?: string;
  photos?: string[];
}

function normalizePhotos(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0 && item.length <= 500 && isAllowedPhotoUrl(item))
    .slice(0, 4);
}

function isAllowedPhotoUrl(url: string): boolean {
  if (url.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function getSwipeProfile(userId: string) {
  const row = await queryOne<{ user_id: string; bio: string | null; photos: unknown }>(
    'SELECT user_id, bio, photos FROM social_swipe_profiles WHERE user_id = $1',
    [userId]
  );

  return {
    userId,
    bio: row?.bio || '',
    photos: normalizePhotos(row?.photos)
  };
}

export async function upsertSwipeProfile(userId: string, input: SwipeProfileInput) {
  const photos = normalizePhotos(input.photos);
  const bio = typeof input.bio === 'string' ? input.bio.trim().slice(0, 600) : '';

  await query(
    `INSERT INTO social_swipe_profiles (user_id, bio, photos, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET bio = EXCLUDED.bio, photos = EXCLUDED.photos, updated_at = NOW()`,
    [userId, bio, JSON.stringify(photos)]
  );

  return getSwipeProfile(userId);
}

export async function getSwipeCandidates(userId: string, limit = 20) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 50) : 20;

  const rows = await queryMany<{
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    photo_urls: unknown;
    bio: string | null;
  }>(
    `SELECT
       u.id,
       u.username,
       u.full_name,
       u.avatar_url,
       p.photos AS photo_urls,
       p.bio
     FROM users u
     LEFT JOIN social_swipe_profiles p ON p.user_id = u.id
     WHERE u.id <> $1
       AND NOT EXISTS (
         SELECT 1 FROM user_blocks b
         WHERE (b.blocker_id = u.id AND b.blocked_id = $1)
            OR (b.blocker_id = $1 AND b.blocked_id = u.id)
       )
       AND NOT EXISTS (
         SELECT 1 FROM social_swipes s
         WHERE s.swiper_id = $1 AND s.target_id = u.id
       )
     ORDER BY u.created_at DESC
     LIMIT $2`,
    [userId, safeLimit]
  );

  const candidates: Array<{
    userId: string;
    username: string;
    fullName: string;
    bio: string;
    photos: string[];
  }> = [];

  for (const row of rows) {
    const profilePhotos = normalizePhotos(row.photo_urls);
    const photos = profilePhotos.length > 0 ? profilePhotos : row.avatar_url ? [row.avatar_url] : [];

    candidates.push({
      userId: row.id,
      username: row.username || '',
      fullName: row.full_name || '',
      bio: row.bio || '',
      photos
    });
  }

  return candidates;
}

export async function createSwipe(
  swiperId: string,
  targetId: string,
  direction: SwipeDirection
): Promise<{ matched: boolean; matchId: string | null }> {
  if (swiperId === targetId) {
    return { matched: false, matchId: null };
  }

  await query(
    `INSERT INTO social_swipes (swiper_id, target_id, direction, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (swiper_id, target_id)
     DO UPDATE SET direction = EXCLUDED.direction, updated_at = NOW()`,
    [swiperId, targetId, direction]
  );

  if (direction !== 'like') {
    return { matched: false, matchId: null };
  }

  const reciprocal = await queryOne<{ id: number }>(
    `SELECT id
     FROM social_swipes
     WHERE swiper_id = $1 AND target_id = $2 AND direction = 'like'
     LIMIT 1`,
    [targetId, swiperId]
  );

  if (!reciprocal) {
    return { matched: false, matchId: null };
  }

  const [userA, userB] = swiperId < targetId ? [swiperId, targetId] : [targetId, swiperId];

  const match = await queryOne<{ id: number }>(
    `INSERT INTO social_matches (user_a, user_b, created_at, is_active)
     VALUES ($1, $2, NOW(), TRUE)
     ON CONFLICT (user_a, user_b)
     DO UPDATE SET is_active = TRUE
     RETURNING id`,
    [userA, userB]
  );

  return {
    matched: true,
    matchId: match ? String(match.id) : null
  };
}

export async function getUserMatches(userId: string, limit = 50) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 50;

  return queryMany<{
    id: number;
    created_at: string;
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }>(
    `SELECT
       m.id,
       m.created_at,
       CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END AS user_id,
       u.username,
       u.full_name,
       u.avatar_url
     FROM social_matches m
     JOIN users u ON u.id = CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END
     WHERE (m.user_a = $1 OR m.user_b = $1) AND m.is_active = TRUE
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [userId, safeLimit]
  );
}
