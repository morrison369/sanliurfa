/**
 * POST /api/places/submissions
 * Submit a new place
 * 
 * GET /api/places/submissions
 * Get user's submissions (or pending for admin)
 */

import type { APIRoute } from 'astro';
import { 
  submitPlace,
  saveDraft,
  updateSubmission,
  submitForReview,
  getUserSubmissions,
  getPendingSubmissions,
  getSubmissionById,
  findPotentialDuplicates,
  type SubmissionStatus
} from '../../../lib/places/user-submissions';
import { requireAuth, requireRole } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const searchParams = url.searchParams;
    const status = searchParams.get('status') as SubmissionStatus | 'pending';
    const id = searchParams.get('id');

    // Get single submission
    if (id) {
      const submission = getSubmissionById(id);
      if (!submission) {
        return new Response(
          JSON.stringify({ error: 'Submission not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Check ownership
      if (submission.userId !== auth.user.id && auth.user.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ submission }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Admin: get pending submissions
    if (status === 'pending' && auth.user.role === 'admin') {
      const submissions = getPendingSubmissions();
      return new Response(
        JSON.stringify({ submissions }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's submissions
    const submissions = getUserSubmissions(auth.user.id);
    return new Response(
      JSON.stringify({ submissions }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get submissions';
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
      action = 'submit',
      submissionId,
      name,
      category,
      description,
      shortDescription,
      address,
      district,
      latitude,
      longitude,
      phone,
      website,
      email,
      openingHours,
      features = [],
      priceRange,
      photos = [],
      isOwner = false,
    } = body;

    // Handle different actions
    if (action === 'update' && submissionId) {
      const submission = updateSubmission(submissionId, auth.user.id, {
        name,
        category,
        description,
        shortDescription,
        address,
        district,
        latitude,
        longitude,
        phone,
        website,
        email,
        openingHours,
        features,
        priceRange,
        photos,
      });
      return new Response(
        JSON.stringify({ success: true, submission }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'submitForReview' && submissionId) {
      const submission = submitForReview(submissionId, auth.user.id);
      return new Response(
        JSON.stringify({ success: true, submission }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!name || !category || !description || !address) {
      return new Response(
        JSON.stringify({ error: 'Name, category, description, and address are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicates
    const duplicates = findPotentialDuplicates(name, address);
    if (duplicates.length > 0) {
      return new Response(
        JSON.stringify({ 
          warning: 'Potential duplicates found',
          duplicates,
          proceed: true 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const submissionData = {
      userId: auth.user.id,
      userName: auth.user.full_name || auth.user.username || 'Anonim',
      userEmail: auth.user.email,
      name,
      category,
      description,
      shortDescription,
      address,
      district: district || 'Merkez',
      latitude,
      longitude,
      phone,
      website,
      email,
      openingHours,
      features,
      priceRange,
      photos,
      isOwner,
    };

    let submission;
    if (action === 'draft') {
      submission = saveDraft(submissionData);
    } else {
      submission = submitPlace(submissionData);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        submission,
        message: action === 'draft' ? 'Draft saved' : 'Place submitted for review'
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit place';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
