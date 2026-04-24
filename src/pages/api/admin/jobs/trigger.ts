import type { APIRoute } from 'astro';
import { verifyAdmin } from '../../../../lib/auth';
import { runJob } from '../../../../lib/jobs/scheduler';
import { problemJson } from '../../../../lib/api';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!await verifyAdmin(locals.user)) {
    return problemJson({
      status: 403,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-jobs-trigger-unauthorized',
      instance: '/api/admin/jobs/trigger',
    });
  }
  
  const body = await request.json();
  const { jobName } = body;
  
  if (!jobName) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'jobName zorunludur',
      type: '/problems/admin-jobs-trigger-validation',
      instance: '/api/admin/jobs/trigger',
    });
  }
  
  const result = await runJob(jobName);
  
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
};
