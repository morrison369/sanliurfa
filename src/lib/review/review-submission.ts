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

  // HARD RULE #47: duplicate check moved to INSERT level — catches concurrent submissions atomically
  let result: Awaited<ReturnType<typeof query>>;
  try {
    result = await query(
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
  } catch (err: any) {
    if (err?.code === '23505') {
      throw new Error('Bu mekan için zaten yorum yazdınız.', { cause: err });
    }
    throw err;
  }

  const review = result.rows[0] as Record<string, unknown>;

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
    try {
      const points = await awardPoints(
        user.id,
        'review',
        50,
        String(review.id),
        'Mekan yorumu eklendi',
      );
      pointsEarned = points?.pointsEarned || 0;
    } catch (error) {
      logger.error('Review point award failed', error instanceof Error ? error : new Error(String(error)), {
        userId: user.id,
        placeId,
        reviewId: review.id,
      });
    }
  }

  logger.info('Review submitted', {
    userId: user.id,
    placeId,
    reviewId: review.id,
    status: reviewStatus,
  });

  return {
    success: true,
    review,
    pointsEarned,
    moderation: {
      status: reviewStatus,
      antiSpamScore: antiSpam.score,
      reasons: antiSpam.reasons,
    },
  };
}
