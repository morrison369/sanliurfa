/**
 * Tinder Match Scoring & Filter
 *
 * Audit Priority #4: 15 profil ama 2 swipe. Sebep: random candidate'lar.
 * Bu module candidate ranking için:
 *   1. shared_interests * 10
 *   2. same_district * 5
 *   3. age_in_range * 3
 *   4. profile_completeness * 2
 *   5. recency * 1 (yakın zamanda aktif)
 *
 * Total max score: ~100. Frontend candidate listesini bu score'a göre sıralar.
 */
import { query } from '../postgres';

export interface MatchCandidateRow {
  user_id: string;
  full_name: string;
  username: string | null;
  bio: string | null;
  photos: string[] | null;
  interests: string[] | null;
  preferred_district: string | null;
  age_range_min: number | null;
  age_range_max: number | null;
  looking_for: string | null;
  profile_completeness: number;
  updated_at: string;
}

export interface RankedCandidate extends MatchCandidateRow {
  score: number;
  matchReasons: string[];
}

export interface ViewerProfile {
  user_id: string;
  interests?: string[] | null;
  preferred_district?: string | null;
  age_range_min?: number | null;
  age_range_max?: number | null;
  looking_for?: string | null;
}

const SHARED_INTEREST_WEIGHT = 10;
const SAME_DISTRICT_WEIGHT = 25;
const AGE_OVERLAP_WEIGHT = 15;
const COMPLETENESS_WEIGHT = 0.4; // 0-100 → 0-40
const LOOKING_FOR_MATCH = 10;
const RECENCY_WEIGHT = 5;

export function scoreCandidate(viewer: ViewerProfile, candidate: MatchCandidateRow): RankedCandidate {
  const reasons: string[] = [];
  let score = 0;

  // 1. Shared interests
  if (viewer.interests?.length && candidate.interests?.length) {
    const shared = candidate.interests.filter((i) => viewer.interests!.includes(i));
    if (shared.length) {
      const pts = shared.length * SHARED_INTEREST_WEIGHT;
      score += pts;
      reasons.push(`${shared.length} ortak ilgi (${shared.slice(0, 2).join(', ')})`);
    }
  }

  // 2. Same district
  if (viewer.preferred_district && candidate.preferred_district === viewer.preferred_district) {
    score += SAME_DISTRICT_WEIGHT;
    reasons.push(`Aynı ilçe (${viewer.preferred_district})`);
  }

  // 3. Age range overlap
  if (viewer.age_range_min && viewer.age_range_max && candidate.age_range_min && candidate.age_range_max) {
    const overlapStart = Math.max(viewer.age_range_min, candidate.age_range_min);
    const overlapEnd = Math.min(viewer.age_range_max, candidate.age_range_max);
    if (overlapEnd >= overlapStart) {
      score += AGE_OVERLAP_WEIGHT;
      reasons.push(`Yaş uyumlu`);
    }
  }

  // 4. Profile completeness (0-100 → 0-40 pts)
  score += candidate.profile_completeness * COMPLETENESS_WEIGHT;

  // 5. Same intent
  if (viewer.looking_for && candidate.looking_for === viewer.looking_for) {
    score += LOOKING_FOR_MATCH;
    reasons.push(`Aynı amaç`);
  }

  // 6. Recency: son 7 gün aktif olanları öne çıkar
  const updatedAt = new Date(candidate.updated_at).getTime();
  const daysSince = (Date.now() - updatedAt) / (1000 * 60 * 60 * 24);
  if (daysSince < 7) {
    score += RECENCY_WEIGHT;
    reasons.push('Son 1 hafta aktif');
  }

  return { ...candidate, score: Math.round(score), matchReasons: reasons };
}

/**
 * Get ranked match candidates for a viewer.
 *
 * @param viewerUserId mevcut kullanıcı
 * @param limit max candidate sayısı (default 20)
 * @returns score'a göre azalan sıralı candidate listesi
 */
export async function getRankedCandidates(viewerUserId: string, limit = 20): Promise<RankedCandidate[]> {
  // Viewer profile
  const viewerResult = await query<ViewerProfile>(
    `SELECT user_id, interests, preferred_district, age_range_min, age_range_max, looking_for
     FROM user_match_profiles WHERE user_id = $1`,
    [viewerUserId],
  );
  const viewer = viewerResult.rows[0] || { user_id: viewerUserId };

  // Candidates: discoverable, not self, not already swiped
  // Strategy: pull 2x limit unranked, then score+sort, return top N
  const candidatesResult = await query<MatchCandidateRow>(
    `SELECT
       p.user_id, u.full_name, u.username,
       p.bio, p.photos, p.interests,
       p.preferred_district, p.age_range_min, p.age_range_max, p.looking_for,
       COALESCE(p.profile_completeness, 0) AS profile_completeness,
       p.updated_at::text AS updated_at
     FROM user_match_profiles p
     JOIN users u ON u.id = p.user_id
     WHERE p.is_discoverable = true
       AND p.user_id != $1
       AND NOT EXISTS (
         SELECT 1 FROM social_swipes s
         WHERE s.swiper_id = $1 AND s.target_user_id = p.user_id
       )
     ORDER BY p.profile_completeness DESC NULLS LAST, p.updated_at DESC
     LIMIT $2`,
    [viewerUserId, limit * 2],
  );

  const ranked = candidatesResult.rows
    .map((c) => scoreCandidate(viewer, c))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
}
