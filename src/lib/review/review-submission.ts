import { auditSiteChange } from '../site-content';
import { logger } from '../logging';
import { awardPoints } from '../points/points';
import { query } from '../postgres';
import {
  getReviewAntiSpamConfig,
  isAllowlisted,
  scoreReviewContent,
} from './review-antispam';

export interface ReviewSubmissionUser {
  id: string;
  email?: string | null;
}

export interface ReviewSubmissionInput {
  placeId: string;
  rating: number;
  title?: string | null;
  content: string;
  images?: unknown[];
  visitType?: string | null;
  awardUserPoints?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ReviewSubmissionResult {
  success: true;
  review: Record<string, unknown>;
  pointsEarned: number;
  moderation: {
    status: string;
    antiSpamScore: number;
    reasons: string[];
  };
}

function normalizeTitle(title?: string | null): string | null {
  const normalized = title?.trim() || '';
  return normalized.length > 0 ? normalized.slice(0, 100) : null;
}

export async function submitPlaceReview(
  user: ReviewSubmissionUser,
  input: ReviewSubmissionInput,
): Promise<ReviewSubmissionResult> {
  const placeId = input.placeId.trim();
  const rating = Number(input.rating);
  const content = input.content.trim();

  if (!placeId) {
    throw new Error('Mekan bilgisi eksik.');
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Lütfen 1-5 arası bir puan seçin.');
  }

  if (content.length < 10) {
    throw new Error('Yorum en az 10 karakter olmalıdır.');
  }

  const existing = await query(
    `SELECT id FROM reviews WHERE place_id = $1 AND user_id = $2 AND status != 'deleted'`,
    [placeId, user.id],
  );
  if (existing.rows.length > 0) {
    throw new Error('Bu mekan için zaten yorum yazdınız.');
  }

  const antiSpamConfig = await getReviewAntiSpamConfig();
  const allowlisted =
    isAllowlisted(antiSpamConfig, user.id) || isAllowlisted(antiSpamConfig, user.email || null);
  const antiSpam = allowlisted
    ? { score: 0, hardBlocked: false, autoModerate: false, reasons: [] as string[] }
    : scoreReviewContent(content, antiSpamConfig);

  if (antiSpam.hardBlocked) {
    await auditSiteChange(
      'reviews.antiSpam',
      'social_abuse',
      {
        userId: user.id,
        actorEmail: user.email || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
      {
        reason: 'review_hard_blocked',
        score: antiSpam.score,
        reasons: antiSpam.reasons,
        placeId,
      },
    );
    throw new Error('Yorum içeriğiniz güvenlik politikası nedeniyle gönderilemedi.');
  }

  const reviewStatus = antiSpam.autoModerate ? 'pending' : 'active';
  if (antiSpam.autoModerate) {
    await auditSiteChange(
      'reviews.antiSpam',
      'social_abuse',
      {
        userId: user.id,
        actorEmail: user.email || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
      {
        reason: 'review_auto_moderated',
        score: antiSpam.score,
        reasons: antiSpam.reasons,
        placeId,
      },
    );
  }

  const result = await query(
    `INSERT INTO reviews (place_id, user_id, rating, title, content, images, visit_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      placeId,
      user.id,
      rating,
      normalizeTitle(input.title),
      content,
      input.images || [],
      input.visitType || null,
      reviewStatus,
    ],
  );

  await query(
    `UPDATE places SET
       rating = (SELECT AVG(rating) FROM reviews WHERE place_id = $1 AND status != 'deleted'),
       review_count = (SELECT COUNT(*) FROM reviews WHERE place_id = $1 AND status != 'deleted'),
       updated_at = NOW()
     WHERE id = $1`,
    [placeId],
  );

  let pointsEarned = 0;
  if (input.awardUserPoints) {
    const points = await awardPoints(
      user.id,
      'review',
      50,
      String(result.rows[0].id),
      'Mekan yorumu eklendi',
    );
    pointsEarned = points?.pointsEarned || 0;
  }

  logger.info('Review submitted', {
    userId: user.id,
    placeId,
    reviewId: result.rows[0].id,
    status: reviewStatus,
  });

  return {
    success: true,
    review: result.rows[0],
    pointsEarned,
    moderation: {
      status: reviewStatus,
      antiSpamScore: antiSpam.score,
      reasons: antiSpam.reasons,
    },
  };
}
