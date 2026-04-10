export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  if (typeof (AbortSignal as any)?.timeout === 'function') {
    return fetch(input, { ...init, signal: (AbortSignal as any).timeout(timeoutMs) });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

