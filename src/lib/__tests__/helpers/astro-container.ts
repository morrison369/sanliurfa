type LocalsInput = Partial<App.Locals> & Record<string, unknown>;

type RenderOptions = {
  props?: Record<string, unknown>;
  request?: Request;
  locals?: LocalsInput;
  slots?: Record<string, string>;
};

/**
 * Renders an Astro SSR component to HTML string inside Vitest.
 * Uses Astro's Container API (stable since 4.9, no HTTP server needed).
 *
 * @example
 * const html = await renderAstroComponent(MyPage, { props: { slug: 'test' } });
 * expect(html).toContain('<h1>Test</h1>');
 */
export async function renderAstroComponent(
  Component: any,
  options: RenderOptions = {}
): Promise<string> {
  const AstroContainer = await getAstroContainerApi();
  const container = await AstroContainer.create();
  const { props = {}, request, locals = {}, slots } = options;

  const mergedLocals = buildLocals(locals);
  const response = await container.renderToResponse(Component, {
    props,
    request: request ?? new Request('http://localhost/'),
    locals: mergedLocals,
    ...(slots ? { slots } : {}),
  });

  return response.text();
}

/**
 * Renders to Response for status code / header assertions.
 */
export async function renderAstroToResponse(
  Component: any,
  options: RenderOptions = {}
): Promise<Response> {
  const AstroContainer = await getAstroContainerApi();
  const container = await AstroContainer.create();
  const { props = {}, request, locals = {}, slots } = options;

  return container.renderToResponse(Component, {
    props,
    request: request ?? new Request('http://localhost/'),
    locals: buildLocals(locals),
    ...(slots ? { slots } : {}),
  });
}

function buildLocals(overrides: LocalsInput = {}): App.Locals {
  return {
    user: null,
    isAdmin: false,
    isAuthenticated: false,
    ...overrides,
  } as App.Locals;
}

async function getAstroContainerApi(): Promise<{ create: () => Promise<any> }> {
  const mod = await import('astro/container');
  const api = (mod as any).AstroContainer ?? (mod as any).experimental_AstroContainer;
  if (!api?.create) {
    throw new Error('Astro Container API export bulunamadı');
  }
  return api;
}
