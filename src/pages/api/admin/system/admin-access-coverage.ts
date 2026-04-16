import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { getAdminAccessCoverage } from '../../../../lib/admin-access-coverage';
import { withAdminOpsReadAccess } from '../../../../lib/admin-ops-access';
import { buildArtifactHealth } from '../../../../lib/admin-status';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

const MARKDOWN_REPORT_PATH = resolve(process.cwd(), 'docs', 'reports', 'admin-access-coverage.md');

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/system/admin-access-coverage',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/system/admin-access-coverage', statusCode, duration);
        },
        onSuccess: (_response, duration) => {
          recordRequest('GET', '/api/admin/system/admin-access-coverage', HttpStatus.OK, duration);
        },
      },
      async () => {
        const url = new URL(request.url);
        const format = url.searchParams.get('format');
        const report = await getAdminAccessCoverage();
        const artifact = buildArtifactHealth({
          kind: 'adminAccessCoverage',
          available: report.available,
          generatedAt: report.generatedAt,
        });

        if (format === 'json') {
          return new Response(`${JSON.stringify(report, null, 2)}\n`, {
            status: HttpStatus.OK,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'content-disposition': 'attachment; filename="admin-access-coverage.json"',
            },
          });
        }

        if (format === 'markdown') {
          const markdownReport = await readFile(MARKDOWN_REPORT_PATH, 'utf8');
          return new Response(markdownReport, {
            status: HttpStatus.OK,
            headers: {
              'content-type': 'text/markdown; charset=utf-8',
              'content-disposition': 'attachment; filename="admin-access-coverage.md"',
            },
          });
        }

        return apiResponse(
          {
            success: true,
            data: {
              report,
              artifact,
              artifactName: 'admin-access-coverage',
              reportFormats: ['json', 'markdown'],
            },
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/system/admin-access-coverage', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Admin access coverage fetch failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Admin access coverage özeti alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
