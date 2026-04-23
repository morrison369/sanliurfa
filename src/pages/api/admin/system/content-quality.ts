import type { APIRoute } from 'astro';
import { ErrorCode, HttpStatus, apiError, apiResponse, getRequestId } from '../../../../lib/api';
import { getHomepageData } from '../../../../lib/homepage-data';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startedAt = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user || locals.user.role !== 'admin') {
      recordRequest('GET', '/api/admin/system/content-quality', HttpStatus.FORBIDDEN, Date.now() - startedAt);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const homepageData = await getHomepageData({ placesLimit: 8, postsLimit: 6 });
    const kpis = homepageData.kpis;

    recordRequest('GET', '/api/admin/system/content-quality', HttpStatus.OK, Date.now() - startedAt);
    return apiResponse(
      {
        success: true,
        data: {
          contentQuality: {
            places: {
              activeTotal: kpis.activePlaceCount,
              publishReadyTotal: kpis.publishReadyPlaceCount,
              withoutImageTotal: kpis.placesWithoutImageCount,
              imageCoveragePercent: kpis.placeImageCoveragePercent,
              publishReadinessPercent: kpis.placePublishReadinessPercent,
            },
            blog: {
              publishedTotal: kpis.publishedBlogCount,
              withoutImageTotal: kpis.blogWithoutImageCount,
              imageCoveragePercent: kpis.blogImageCoveragePercent,
            },
          },
          homepage: {
            featuredPlaceCount: homepageData.places.length,
            latestPostCount: homepageData.posts.length,
          },
          timestamp: new Date().toISOString(),
        },
      },
      HttpStatus.OK,
      requestId,
    );
  } catch (error) {
    recordRequest('GET', '/api/admin/system/content-quality', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startedAt);
    logger.error('Admin content quality metrics failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İçerik kalite metrikleri alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId,
    );
  }
};
