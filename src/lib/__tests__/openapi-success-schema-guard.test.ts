import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

type SuccessCheck = {
  name: string;
  getRef: (spec: any) => string | undefined;
  expected: string;
};

const checks: SuccessCheck[] = [
  {
    name: 'places availability 200',
    getRef: (spec) =>
      spec?.paths?.['/places/{id}/availability']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    expected: '#/components/schemas/PlaceAvailabilityResponse',
  },
  {
    name: 'places review analytics 200',
    getRef: (spec) =>
      spec?.paths?.['/places/{id}/review-analytics']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    expected: '#/components/schemas/PlaceReviewAnalyticsResponse',
  },
  {
    name: 'places rating distribution 200',
    getRef: (spec) =>
      spec?.paths?.['/places/{id}/rating-distribution']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    expected: '#/components/schemas/PlaceRatingDistributionResponse',
  },
  {
    name: 'places request verification 201',
    getRef: (spec) =>
      spec?.paths?.['/places/{id}/request-verification']?.post?.responses?.['201']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    expected: '#/components/schemas/PlaceRequestVerificationResponse',
  },
  {
    name: 'places promotions 200',
    getRef: (spec) =>
      spec?.paths?.['/places/{id}/promotions']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    expected: '#/components/schemas/PlacePromotionsResponse',
  },
  {
    name: 'auth register 201',
    getRef: (spec) =>
      spec?.paths?.['/auth/register']?.post?.responses?.['201']?.content?.['application/json']?.schema
        ?.$ref,
    expected: '#/components/schemas/AuthRegisterResponse',
  },
  {
    name: 'user favorites 200',
    getRef: (spec) =>
      spec?.paths?.['/user/favorites']?.get?.responses?.['200']?.content?.['application/json']?.schema
        ?.$ref,
    expected: '#/components/schemas/UserFavoritesResponse',
  },
  {
    name: 'admin dashboard 200',
    getRef: (spec) =>
      spec?.paths?.['/admin/dashboard']?.get?.responses?.['200']?.content?.['application/json']?.schema
        ?.$ref,
    expected: '#/components/schemas/AdminDashboardResponse',
  },
  {
    name: 'search advanced 200',
    getRef: (spec) =>
      spec?.paths?.['/search/advanced']?.get?.responses?.['200']?.content?.['application/json']?.schema
        ?.$ref,
    expected: '#/components/schemas/SearchAdvancedResponse',
  },
];

describe('openapi success schema guard', () => {
  it('keeps critical success responses on shared component refs', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const check of checks) {
      expect(check.getRef(spec), check.name).toBe(check.expected);
    }
  });
});
