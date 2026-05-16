export type ClientApiError = {
  message: string;
  status: number;
  requestId: string | null;
  endpoint: string;
  details?: unknown;
};

export type ClientApiResult<T> =
  | { ok: true; data: T; requestId: string | null; status: number }
  | { ok: false; error: ClientApiError };

export async function fetchJson<T>(endpoint: string, init?: RequestInit): Promise<ClientApiResult<T>> {
  try {
    const res = await fetch(endpoint, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
    });
    const requestId = res.headers.get('x-request-id');
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: {
          message: body?.detail || body?.error?.message || body?.message || 'İşlem tamamlanamadı.',
          status: res.status,
          requestId: requestId || body?.requestId || body?.meta?.requestId || null,
          endpoint,
          details: body,
        },
      };
    }
    return {
      ok: true,
      data: (body?.data ?? body) as T,
      requestId: requestId || body?.requestId || body?.meta?.requestId || null,
      status: res.status,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : 'Bağlantı hatası',
        status: 0,
        requestId: null,
        endpoint,
      },
    };
  }
}

export function formatClientApiError(error: ClientApiError): string {
  const suffix = error.requestId ? ` · RequestId: ${error.requestId}` : '';
  return `${error.endpoint} · HTTP ${error.status || 'network'} · ${error.message}${suffix}`;
}
