import type { APIRoute } from 'astro';
import { verifyAdmin } from '../../../../lib/auth';
import { runJob } from '../../../../lib/jobs/scheduler';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!await verifyAdmin(locals.user)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }
  
  const body = await request.json();
  const { jobName } = body;
  
  if (!jobName) {
    return new Response(JSON.stringify({ error: 'Job name required' }), { status: 400 });
  }
  
  const result = await runJob(jobName);
  
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
};
