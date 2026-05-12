/**
 * API Contract Tests - POST /api/reviews/add
 *
 * - Auth required → 401 problem+json
 * - Validation: rating 1-5, content 10-5000, title maxLength 200
 * - Images array max 20 → 422
 * - submitPlaceReview helper called with sanitized payload
 * - safeErrorDetail used in catch (HARD RULE #9 / #48)
 *
 * vi.hoisted - submitPlaceReview mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { submitPlaceReviewMock } = vi.hoisted(() => ({
  submitPlaceReviewMock: vi.fn(),
}));

vi.mock('../review/review-submission', () => ({
  submitPlaceReview: submitPlaceReviewMock,
}));

beforeEach(() => {
  submitPlaceReviewMock.mockReset();
});

import { POST } from '../../pages/api/reviews/add';

const validBody = {
  placeId: 'place-uuid-1',
  rating: 5,
  title: 'Harika',
  content: 'Çok güzel bir mekan, mutlaka deneyin. Servis kalitesi ve yemekler mükemmel.',
};

const authedUser = { id: 'user-1', email: 'user@test.com', role: 'user' };

describe('POST /api/reviews/add', () => {
  it('no auth → 401 problem+json with /problems/auth-required', async () => {
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: {} });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/auth-required');
    expect(data.detail).toMatch(/Giriş gerekli/);
  });

  it('valid - submitPlaceReview called + 200', async () => {
    submitPlaceReviewMock.mockResolvedValueOnce({ success: true, reviewId: 'r-1' });
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: { user: authedUser } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    expect(submitPlaceReviewMock).toHaveBeenCalledWith(
      { id: 'user-1', email: 'user@test.com' },
      expect.objectContaining({
        placeId: 'place-uuid-1',
        rating: 5,
        content: validBody.content,
        awardUserPoints: true,
      })
    );
  });

  it('rating out of range → 422 validation error', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, rating: 6 },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/validation-error');
    expect(submitPlaceReviewMock).not.toHaveBeenCalled();
  });

  it('content too short (<10 chars) → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, content: 'kısa' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
    expect(submitPlaceReviewMock).not.toHaveBeenCalled();
  });

  it('images > 20 → 422 review-images-invalid', async () => {
    const tooManyImages = Array.from({ length: 21 }, (_, i) => `/img/${i}.jpg`);
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, images: tooManyImages },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/review-images-invalid');
  });

  it('images not array → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, images: 'not-array' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('snake_case place_id supported (legacy)', async () => {
    submitPlaceReviewMock.mockResolvedValueOnce({ success: true });
    const { placeId, ...rest } = validBody;
    const ctx = createApiContext({
      method: 'POST',
      body: { ...rest, place_id: 'place-snake-case' },
      locals: { user: authedUser },
    });
    await POST(ctx);
    expect(submitPlaceReviewMock.mock.calls[0][1].placeId).toBe('place-snake-case');
  });

  it('IP address forwarded from x-forwarded-for', async () => {
    submitPlaceReviewMock.mockResolvedValueOnce({ success: true });
    const ctx = createApiContext({
      method: 'POST',
      body: validBody,
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.42, 10.0.0.1' },
      locals: { user: authedUser },
    });
    await POST(ctx);
    expect(submitPlaceReviewMock.mock.calls[0][1].ipAddress).toBe('203.0.113.42');
  });

  it('helper throws → 400 review-add-failed (HARD RULE #9 safeErrorDetail)', async () => {
    submitPlaceReviewMock.mockRejectedValueOnce(new Error('DB constraint duplicate_key_users'));
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: { user: authedUser } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/review-add-failed');
  });
});
