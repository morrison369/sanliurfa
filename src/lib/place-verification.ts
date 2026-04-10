/**
 * Place Verification & Badges System
 * Manage place verification status and trust badges
 */

import { query, queryOne, queryRows, insert, update } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface PlaceVerification {
  id: string;
  placeId: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  reason?: string;
  documents?: any[];
  requestedAt: string;
  updatedAt: string;
}

export interface PlaceBadge {
  id: string;
  placeId: string;
  badgeType: string;
  badgeName: string;
  icon?: string;
  awardedAt: string;
  reason?: string;
}

export interface BadgeDefinition {
  id: string;
  type: string;
  name: string;
  icon?: string;
  description?: string;
  autoAward: boolean;
}

/**
 * Submit a verification request for a place
 */
export async function requestPlaceVerification(
  placeId: string,
  documents?: any[]
): Promise<PlaceVerification | null> {
  try {
    // Check if already verified or pending
    const existing = await queryOne(
      'SELECT id FROM place_verification WHERE place_id = $1 AND status != $2',
      [placeId, 'rejected']
    );

    if (existing) {
      return null;
    }

    // Insert verification request
    const result = await insert('place_verification', {
      place_id: placeId,
      status: 'pending',
      documents: documents || []
    });

    // Invalidate cache
    await deleteCache(`sanliurfa:place:verification:${placeId}`);

    logger.info('Place verification requested', { placeId });

    return {
      id: result.id,
      placeId,
      status: 'pending',
      documents,
      requestedAt: result.requested_at,
      updatedAt: result.updated_at
    };
  } catch (error) {
    logger.error('Failed to request verification', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get place verification status
 */
export async function getPlaceVerification(placeId: string): Promise<PlaceVerification | null> {
  try {
    const cacheKey = `sanliurfa:place:verification:${placeId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await queryOne(
      `SELECT id, place_id, status, verified_by, verified_at, reason, documents, requested_at, updated_at
       FROM place_verification
       WHERE place_id = $1`,
      [placeId]
    );

    if (!result) {
      return null;
    }

    const verification: PlaceVerification = {
      id: result.id,
      placeId: result.place_id,
      status: result.status,
      verifiedBy: result.verified_by,
      verifiedAt: result.verified_at,
      reason: result.reason,
      documents: result.documents,
      requestedAt: result.requested_at,
      updatedAt: result.updated_at
    };

    // Cache for 1 hour
    await setCache(cacheKey, JSON.stringify(verification), 3600);

    return verification;
  } catch (error) {
    logger.error('Failed to get verification', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Approve place verification (admin)
 */
export async function approveVerification(
  verificationId: string,
  verifiedBy: string,
  reason?: string
): Promise<boolean> {
  try {
    const verification = await queryOne(
      'SELECT place_id FROM place_verification WHERE id = $1',
      [verificationId]
    );

    if (!verification) {
      return false;
    }

    // Update verification
    await query(
      `UPDATE place_verification
       SET status = $1, verified_by = $2, verified_at = NOW(), reason = $3, updated_at = NOW()
       WHERE id = $4`,
      ['verified', verifiedBy, reason, verificationId]
    );

    // Update place status
    await query(
      'UPDATE places SET verification_status = $1 WHERE id = $2',
      ['verified', verification.place_id]
    );

    // Award verification badge
    await awardBadge(verification.place_id, 'verified', verifiedBy, reason);

    // Invalidate cache
    await deleteCache(`sanliurfa:place:verification:${verification.place_id}`);

    logger.info('Verification approved', { verificationId, verifiedBy });
    return true;
  } catch (error) {
    logger.error('Failed to approve verification', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Reject place verification (admin)
 */
export async function rejectVerification(
  verificationId: string,
  rejectedBy: string,
  reason: string
): Promise<boolean> {
  try {
    const verification = await queryOne(
      'SELECT place_id FROM place_verification WHERE id = $1',
      [verificationId]
    );

    if (!verification) {
      return false;
    }

    // Update verification
    await query(
      `UPDATE place_verification
       SET status = $1, reason = $2, updated_at = NOW()
       WHERE id = $3`,
      ['rejected', reason, verificationId]
    );

    // Invalidate cache
    await deleteCache(`sanliurfa:place:verification:${verification.place_id}`);

    logger.info('Verification rejected', { verificationId, rejectedBy });
    return true;
  } catch (error) {
    logger.error('Failed to reject verification', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Award a badge to a place
 */
export async function awardBadge(
  placeId: string,
  badgeType: string,
  awardedBy?: string,
  reason?: string
): Promise<PlaceBadge | null> {
  try {
    // Get badge definition
    const badge = await queryOne(
      'SELECT id, name, icon FROM badge_definitions WHERE type = $1',
      [badgeType]
    );

    if (!badge) {
      return null;
    }

    // Insert badge
    const result = await insert('place_badges', {
      place_id: placeId,
      badge_type: badgeType,
      awarded_by: awardedBy,
      reason
    });

    // Invalidate cache
    await deleteCache(`sanliurfa:place:badges:${placeId}`);

    logger.info('Badge awarded', { placeId, badgeType });

    return {
      id: result.id,
      placeId,
      badgeType,
      badgeName: badge.name,
      icon: badge.icon,
      awardedAt: result.awarded_at,
      reason
    };
  } catch (error) {
    logger.error('Failed to award badge', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get all badges for a place
 */
export async function getPlaceBadges(placeId: string): Promise<PlaceBadge[]> {
  try {
    const cacheKey = `sanliurfa:place:badges:${placeId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
      `SELECT pb.id, pb.place_id, pb.badge_type, bd.name, bd.icon, pb.awarded_at, pb.reason
       FROM place_badges pb
       JOIN badge_definitions bd ON pb.badge_type = bd.type
       WHERE pb.place_id = $1
       ORDER BY pb.awarded_at DESC`,
      [placeId]
    );

    const badges: PlaceBadge[] = results.map((r: any) => ({
      id: r.id,
      placeId: r.place_id,
      badgeType: r.badge_type,
      badgeName: r.name,
      icon: r.icon,
      awardedAt: r.awarded_at,
      reason: r.reason
    }));

    // Cache for 2 hours
    await setCache(cacheKey, JSON.stringify(badges), 7200);

    return badges;
  } catch (error) {
    logger.error('Failed to get badges', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get all badge definitions
 */
export async function getBadgeDefinitions(): Promise<BadgeDefinition[]> {
  try {
    const cacheKey = 'sanliurfa:badge:definitions';
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
      'SELECT id, type, name, icon, description, auto_award FROM badge_definitions ORDER BY name',
      []
    );

    const definitions: BadgeDefinition[] = results.map((r: any) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      icon: r.icon,
      description: r.description,
      autoAward: r.auto_award
    }));

    // Cache for 24 hours
    await setCache(cacheKey, JSON.stringify(definitions), 86400);

    return definitions;
  } catch (error) {
    logger.error('Failed to get badge definitions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get pending verification requests (admin)
 */
export async function getPendingVerifications(limit: number = 50): Promise<any[]> {
  try {
    const results = await queryRows(
      `SELECT pv.id, pv.place_id, pv.requested_at, pv.reason,
              p.name as place_name, p.category, p.rating
       FROM place_verification pv
       JOIN places p ON pv.place_id = p.id
       WHERE pv.status = 'pending'
       ORDER BY pv.requested_at ASC
       LIMIT $1`,
      [limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      placeId: r.place_id,
      placeName: r.place_name,
      category: r.category,
      rating: r.rating,
      requestedAt: r.requested_at,
      reason: r.reason
    }));
  } catch (error) {
    logger.error('Failed to get pending verifications', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
