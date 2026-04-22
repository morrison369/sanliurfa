export function unwrapApiPayload<T = any>(responseBody: any): T {
  return (responseBody?.data || responseBody) as T;
}

export function getApiErrorMessage(responseBody: any, fallback: string): string {
  return responseBody?.error?.message || responseBody?.error || responseBody?.message || fallback;
}
