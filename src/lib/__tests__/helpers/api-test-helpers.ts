import { expect } from 'vitest';

type ApiContextOptions = {
  url?: string;
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
  params?: Record<string, string | undefined>;
  locals?: Record<string, unknown>;
};

export function createApiContext(options: ApiContextOptions = {}) {
  const {
    url = 'http://localhost/api/test',
    method = 'GET',
    body,
    headers,
    params = {},
    locals = {},
  } = options;

  const requestInit: RequestInit = {
    method,
    headers: headers ?? (body ? { 'Content-Type': 'application/json' } : undefined),
  };

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  return {
    request: new Request(url, requestInit),
    params,
    locals,
    url: new URL(url),
  } as any;
}

export async function parseJson<T = any>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function expectApiErrorCode(body: any, code: string) {
  expect(body?.error?.code).toBe(code);
}
