/**
 * GET /api/reviews
 * Get reviews for a place or user
 * 
 * POST /api/reviews
 * Create a new review
 */

import type { APIRoute } from 'astro';
import { 
  getPlaceReviews,
  getUserReviews,
  getUserReviewForPlace,
  createReview,
  updateReview,
  deleteReview,
  toggleLikeReview,
  markHelpful,
  getRatingBreakdown,
  hasUserReviewed,
  type ReviewFilter
} from '../../../lib/places/reviews';
import { requireAuth } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const searchParams = url.searchParams;
    const placeId = searchParams.get('placeId');
    const userId = searchParams.get('userId');
    const stats = searchParams.get('stats');

    // Get rating breakdown
    if (stats && placeId) {
      const breakdown = getRatingBreakdown(placeId);
      return new Response(
        JSON.stringify({ breakdown }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build filter
    const filter: ReviewFilter = {
      sortBy: (searchParams.get('sortBy') as ReviewFilter['sortBy']) || 'newest',
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      visitType: searchParams.get('visitType') as ReviewFilter['visitType'],
      hasPhotos: searchParams.get('hasPhotos') === 'true',
      verifiedOnly: searchParams.get('verifiedOnly') === 'true',
    };

    if (placeId) {
      const reviews = getPlaceReviews(placeId, filter);
      
      // Check if current user has reviewed
      const authHeader = request.headers.get('authorization');
      let userReview = null;
      if (authHeader) {
        const auth = await requireAuth(request);
        if (!(auth instanceof Response)) {
          userReview = getUserReviewForPlace(placeId, auth.user.id);
        }
      }

      return new Response(
        JSON.stringify({ reviews, userReview }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (userId) {
      const reviews = getUserReviews(userId);
      return new Response(
        JSON.stringify({ reviews }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Place ID or User ID required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get reviews';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { 
      placeId, 
      rating, 
      content, 
      title,
      photos = [],
      visitDate,
      visitType,
      pros = [],
      cons = [],
      action,
      reviewId 
    } = body;

    // Handle like/helpful actions
    if (action === 'like' && reviewId) {
      const review = toggleLikeReview(reviewId, auth.user.id);
      return new Response(
        JSON.stringify({ success: true, review }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'helpful' && reviewId) {
      const review = markHelpful(reviewId, auth.user.id);
      return new Response(
        JSON.stringify({ success: true, review }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle update
    if (action === 'update' && reviewId) {
      const review = updateReview(reviewId, auth.user.id, {
        rating,
        title,
        content,
        photos,
        visitDate,
        visitType,
        pros,
        cons,
      });
      return new Response(
        JSON.stringify({ success: true, review }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle delete
    if (action === 'delete' && reviewId) {
      const success = deleteReview(reviewId, auth.user.id);
      return new Response(
        JSON.stringify({ success }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create new review
    if (!placeId || !rating || !content) {
      return new Response(
        JSON.stringify({ error: 'Place ID, rating, and content are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Rating must be between 1 and 5' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already reviewed
    if (hasUserReviewed(placeId, auth.user.id)) {
      return new Response(
        JSON.stringify({ error: 'You have already reviewed this place' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const review = createReview({
      placeId,
      userId: auth.user.id,
      userName: auth.user.full_name || auth.user.username || 'Anonim',
      userAvatar: auth.user.avatar_url,
      rating,
      title,
      content,
      photos,
      visitDate,
      visitType,
      pros,
      cons,
      isVerified: false, // Would need check-in verification
    });

    return new Response(
      JSON.stringify({ success: true, review }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create review';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
