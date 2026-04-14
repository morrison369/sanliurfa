/**
 * Admin Moderation API
 * POST /api/admin/moderation
 * - reviews: approve/reject/flag reviews
 * - submissions: approve/reject submissions
 * - reports: handle user reports
 */

import type { APIRoute } from 'astro';
import { moderateReview, getPendingReviews, getReviewStats } from '../../../lib/places/reviews';
import { approveSubmission, rejectSubmission, requestMoreInfo, getSubmissionStats } from '../../../lib/places/user-submissions';
import { requireRole } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Require admin role
    const auth = await requireRole(request, 'admin');
    if (auth instanceof Response) return auth;

    const searchParams = url.searchParams;
    const type = searchParams.get('type');

    if (type === 'reviews') {
      const pending = getPendingReviews();
      const stats = getReviewStats();
      return new Response(
        JSON.stringify({ pending, stats }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'submissions') {
      const stats = getSubmissionStats();
      return new Response(
        JSON.stringify({ stats }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Type required (reviews|submissions)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get moderation data';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Require admin role
    const auth = await requireRole(request, 'admin');
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { type, action, id, reason, notes } = body;

    if (!type || !action || !id) {
      return new Response(
        JSON.stringify({ error: 'Type, action, and ID are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Review moderation
    if (type === 'review') {
      if (action === 'approve') {
        const review = moderateReview(id, 'approved');
        return new Response(
          JSON.stringify({ success: true, review }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'reject') {
        if (!reason) {
          return new Response(
            JSON.stringify({ error: 'Reason required for rejection' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        const review = moderateReview(id, 'rejected');
        return new Response(
          JSON.stringify({ success: true, review, reason }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'flag') {
        const review = moderateReview(id, 'flagged');
        return new Response(
          JSON.stringify({ success: true, review }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Submission moderation
    if (type === 'submission') {
      if (action === 'approve') {
        const submission = approveSubmission(id, auth.user.id, notes);
        return new Response(
          JSON.stringify({ success: true, submission }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'reject') {
        if (!reason) {
          return new Response(
            JSON.stringify({ error: 'Reason required for rejection' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        const submission = rejectSubmission(id, auth.user.id, reason);
        return new Response(
          JSON.stringify({ success: true, submission }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'requestInfo') {
        if (!reason) {
          return new Response(
            JSON.stringify({ error: 'Requested info required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        const submission = requestMoreInfo(id, auth.user.id, reason);
        return new Response(
          JSON.stringify({ success: true, submission }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid type or action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Moderation action failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
