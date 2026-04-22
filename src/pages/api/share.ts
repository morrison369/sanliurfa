import type { APIRoute } from 'astro';

const SITE_ORIGIN = 'https://sanliurfa.com';

function safeRedirectFromSharedUrl(sharedUrl: string | null): string | null {
  if (!sharedUrl) {
    return null;
  }

  try {
    const parsed = new URL(sharedUrl, SITE_ORIGIN);
    if (parsed.origin !== SITE_ORIGIN) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function searchRedirect(title: string | null, text: string | null): string {
  const query = [title, text]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .slice(0, 160);

  return query ? `/arama?q=${encodeURIComponent(query)}` : '/';
}

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return Response.redirect(new URL('/', request.url), 303);
  }

  const title = formData.get('title')?.toString() || null;
  const text = formData.get('text')?.toString() || null;
  const url = formData.get('url')?.toString() || null;
  const sameSiteTarget = safeRedirectFromSharedUrl(url);
  const target = sameSiteTarget || searchRedirect(title, text);

  return Response.redirect(new URL(target, request.url), 303);
};

export const GET: APIRoute = async ({ request }) => {
  return Response.redirect(new URL('/', request.url), 303);
};
