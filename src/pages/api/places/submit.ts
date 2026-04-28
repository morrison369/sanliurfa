import type { APIRoute } from 'astro';

// Legacy endpoint kept for backward compatibility.
// Canonical submission endpoint is /api/places/apply.
export const POST: APIRoute = async ({ redirect }) => {
  return redirect('/api/places/apply', 308);
};
