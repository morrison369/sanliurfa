export interface LegacyRouteOptions {
  replacementPath: string;
  sunsetDate: string;
  docUrl?: string;
}

export function buildLegacyHeaders(options: LegacyRouteOptions): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Deprecation', 'true');
  headers.set('Sunset', options.sunsetDate);
  headers.set('Link', `<${options.replacementPath}>; rel="successor-version"`);
  headers.set('X-Legacy-Endpoint', 'true');
  if (options.docUrl) {
    headers.append('Link', `<${options.docUrl}>; rel="deprecation"`);
  }
  return headers;
}

export function legacyRedirectResponse(
  requestUrl: string,
  options: LegacyRouteOptions
): Response {
  const source = new URL(requestUrl);
  const destination = new URL(options.replacementPath, source.origin);
  destination.search = source.search;

  const headers = buildLegacyHeaders(options);
  headers.set('Location', destination.toString());

  return new Response(
    JSON.stringify({
      ok: true,
      legacy: true,
      redirectedTo: destination.pathname,
      message: `Bu endpoint kullanımdan kalkıyor. ${options.replacementPath} kullanın.`,
    }),
    { status: 301, headers }
  );
}
