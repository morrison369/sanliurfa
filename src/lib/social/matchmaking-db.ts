import { query, queryMany, queryOne } from '../postgres';
import { getSocialFeatureConfig } from './match-features';

export type SwipeDirection = 'left' | 'right';

export interface MatchCandidate {
  userId: string;
  fullName: string;
  username: string | null;
  bio: string;
  photos: string[];
}

export interface UserMatch {
  matchId: number;
  matchedAt: string;
  otherUserId: string;
  otherUserName: string;
  otherUsername: string | null;
  otherUserPhotos: string[];
  conversationId?: string | null;
}

export interface SwipeQuota {
  dailyLimit: number;
  usedToday: number;
  remaining: number;
}

let ensurePromise: Promise<void> | null = null;

async function ensureMatchTables(): Promise<void> {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS user_match_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT DEFAULT '',
        photos TEXT[] DEFAULT '{}',
        is_discoverable BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS social_swipes (
        id BIGSERIAL PRIMARY KEY,
        swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        direction VARCHAR(10) NOT NULL CHECK (direction IN ('left', 'right')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(swiper_id, target_user_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS social_matches (
        id BIGSERIAL PRIMARY KEY,
        user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_a_id, user_b_id)
      )
    `);
  })();

  return ensurePromise;
}

function normalizePhotos(photos: string[]): string[] {
  return photos
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export async function upsertMatchProfile(userId: string, input: {
  bio?: string;
  photos?: string[];
  isDiscoverable?: boolean;
  interests?: string[] | undefined;
  ageRangeMin?: number | null | undefined;
  ageRangeMax?: number | null | undefined;
  preferredDistrict?: string | null | undefined;
  lookingFor?: string | null | undefined;
}) {
  await ensureMatchTables();

  const photos = normalizePhotos(input.photos || []);
  const bio = (input.bio || '').trim();
  const isDiscoverable = input.isDiscoverable ?? true;
  // Extended fields (migration 183)
  const interests = Array.isArray(input.interests)
    ? input.interests.filter(i => typeof i === 'string' && i.trim().length > 0).slice(0, 12)
    : null;
  const ageMin = (typeof input.ageRangeMin === 'number' && input.ageRangeMin >= 18 && input.ageRangeMin <= 99) ? input.ageRangeMin : null;
  const ageMax = (typeof input.ageRangeMax === 'number' && input.ageRangeMax >= 18 && input.ageRangeMax <= 99) ? input.ageRangeMax : null;
  const district = input.preferredDistrict?.trim() || null;
  const lookingFor = input.lookingFor?.trim() || null;

  const row = await queryOne(
    `
      INSERT INTO user_match_profiles
        (user_id, bio, photos, is_discoverable, interests, age_range_min, age_range_max, preferred_district, looking_for, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        bio = EXCLUDED.bio,
        photos = EXCLUDED.photos,
        is_discoverable = EXCLUDED.is_discoverable,
        interests = EXCLUDED.interests,
        age_range_min = EXCLUDED.age_range_min,
        age_range_max = EXCLUDED.age_range_max,
        preferred_district = EXCLUDED.preferred_district,
        looking_for = EXCLUDED.looking_for,
        profile_completeness = calc_match_profile_completeness(user_match_profiles),
        updated_at = NOW()
      RETURNING user_id, bio, photos, is_discoverable, interests, age_range_min, age_range_max, preferred_district, looking_for, profile_completeness, updated_at
    `,
    [userId, bio, photos, isDiscoverable, interests, ageMin, ageMax, district, lookingFor]
  );

  return row;
}

export async function getMatchProfile(userId: string) {
  await ensureMatchTables();
  return queryOne(
    `SELECT user_id, bio, photos, is_discoverable,
            interests, age_range_min, age_range_max, preferred_district, looking_for, profile_completeness,
            updated_at
     FROM user_match_profiles WHERE user_id = $1`,
    [userId]
  );
}

export async function getMatchCandidates(userId: string, limit = 20): Promise<MatchCandidate[]> {
  await ensureMatchTables();
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const rows = await queryMany(
    `
      SELECT
        u.id AS user_id,
        COALESCE(u.full_name, 'Üye') AS full_name,
        u.username,
        COALESCE(mp.bio, '') AS bio,
        CASE
          WHEN mp.photos IS NOT NULL AND cardinality(mp.photos) > 0 THEN mp.photos
          WHEN u.avatar_url IS NOT NULL AND u.avatar_url <> '' THEN ARRAY[u.avatar_url]
          ELSE ARRAY[]::TEXT[]
        END AS photos
      FROM users u
      LEFT JOIN user_match_profiles mp ON mp.user_id = u.id
      WHERE u.id <> $1
        AND COALESCE(mp.is_discoverable, true) = true
        AND NOT EXISTS (
          SELECT 1 FROM social_swipes s
          WHERE s.swiper_id = $1 AND s.target_user_id = u.id
        )
      ORDER BY u.created_at DESC
      LIMIT $2
    `,
    [userId, safeLimit]
  );

  return rows.map((r: any) => ({
    userId: r.user_id,
    fullName: r.full_name,
    username: r.username,
    bio: r.bio,
    photos: normalizePhotos(Array.isArray(r.photos) ? r.photos : []),
  }));
}

function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function recordSwipe(userId: string, targetUserId: string, direction: SwipeDirection) {
  await ensureMatchTables();
  const quota = await getSwipeQuota(userId);

  if (userId === targetUserId) {
    throw new Error('Kullanıcı kendisini eşleştiremez');
  }

  if (quota.remaining <= 0) {
    throw new Error(`Günlük kaydırma limitine ulaştınız (${quota.dailyLimit})`);
  }

  await query(
    `
      INSERT INTO social_swipes (swiper_id, target_user_id, direction, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (swiper_id, target_user_id)
      DO UPDATE SET direction = EXCLUDED.direction, created_at = NOW()
    `,
    [userId, targetUserId, direction]
  );

  let isMatch = false;

  if (direction === 'right') {
    const reciprocal = await queryOne(
      `
        SELECT 1
        FROM social_swipes
        WHERE swiper_id = $1
          AND target_user_id = $2
          AND direction = 'right'
      `,
      [targetUserId, userId]
    );

    if (reciprocal) {
      const [a, b] = sortPair(userId, targetUserId);
      await query(
        `
          INSERT INTO social_matches (user_a_id, user_b_id, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (user_a_id, user_b_id) DO NOTHING
        `,
        [a, b]
      );
      isMatch = true;
    }
  }

  return {
    isMatch,
    quota: await getSwipeQuota(userId),
  };
}

export async function getUserMatches(userId: string, limit = 30): Promise<UserMatch[]> {
  await ensureMatchTables();
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const rows = await queryMany(
    `
      SELECT
        m.id AS match_id,
        m.created_at AS matched_at,
        other.id AS other_user_id,
        COALESCE(other.full_name, 'Üye') AS other_user_name,
        other.username AS other_username,
        c.id AS conversation_id,
        CASE
          WHEN mp.photos IS NOT NULL AND cardinality(mp.photos) > 0 THEN mp.photos
          WHEN other.avatar_url IS NOT NULL AND other.avatar_url <> '' THEN ARRAY[other.avatar_url]
          ELSE ARRAY[]::TEXT[]
        END AS other_user_photos
      FROM social_matches m
      JOIN users other ON other.id = CASE
        WHEN m.user_a_id = $1 THEN m.user_b_id
        ELSE m.user_a_id
      END
      LEFT JOIN conversations c
        ON LEAST(c.participant_a::text, c.participant_b::text) = LEAST(m.user_a_id::text, m.user_b_id::text)
       AND GREATEST(c.participant_a::text, c.participant_b::text) = GREATEST(m.user_a_id::text, m.user_b_id::text)
      LEFT JOIN user_match_profiles mp ON mp.user_id = other.id
      WHERE m.user_a_id = $1 OR m.user_b_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2
    `,
    [userId, safeLimit]
  );

  return rows.map((r: any) => ({
    matchId: Number(r.match_id),
    matchedAt: r.matched_at,
    otherUserId: r.other_user_id,
    otherUserName: r.other_user_name,
    otherUsername: r.other_username,
    otherUserPhotos: normalizePhotos(Array.isArray(r.other_user_photos) ? r.other_user_photos : []),
    conversationId: r.conversation_id || null,
  }));
}

export async function getSwipeQuota(userId: string): Promise<SwipeQuota> {
  await ensureMatchTables();
  const { dailySwipeLimit } = getSocialFeatureConfig();

  const row = await queryOne<{ count: number }>(
    `
      SELECT COUNT(*)::int AS count
      FROM social_swipes
      WHERE swiper_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
    `,
    [userId]
  );

  const usedToday = Number(row?.count || 0);
  const remaining = Math.max(0, dailySwipeLimit - usedToday);

  return {
    dailyLimit: dailySwipeLimit,
    usedToday,
    remaining,
  };
}
