import type { APIRoute } from 'astro';
import { apiResponse } from '../../../../../lib/api';
import { getImageProvidersConfig } from '../../../../../lib/media/image-providers-config';

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

async function probePexels(key: string) {
  if (!key) return 'missing';
  const res = await fetch('https://api.pexels.com/v1/search?query=Sanliurfa&per_page=1', {
    headers: { Authorization: key },
  });
  return res.ok ? 'working' : 'failing';
}

async function probeUnsplash(key: string) {
  if (!key) return 'missing';
  const res = await fetch('https://api.unsplash.com/search/photos?query=Sanliurfa&per_page=1', {
    headers: { Authorization: `Client-ID ${key}` },
  });
  return res.ok ? 'working' : 'failing';
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return apiResponse({ error: 'Unauthorized' }, 401);
  const cfg = await getImageProvidersConfig();
  const [pexels, unsplash] = await Promise.all([
    probePexels(cfg.pexels_api_key).catch(() => 'failing'),
    probeUnsplash(cfg.unsplash_access_key).catch(() => 'failing'),
  ]);
  return apiResponse({
    success: true,
    providers: {
      pexels,
      unsplash,
    },
  });
};
