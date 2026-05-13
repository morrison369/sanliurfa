/**
 * Frontend API response unwrap helper.
 *
 * Backend `apiResponse()` body'i wrap eder: `{ data, meta }`.
 * Çoğu endpoint payload olarak `{ success: true, data: {...} }` veriyor → final
 * response: `{ data: { success, data: {...} }, meta }` (double-wrap).
 *
 * Bu helper hem flat hem double-wrap shape'i tek yerden çözer; her component'te
 * inline `raw?.data?.X || raw?.data?.data?.X` tekrarını ortadan kaldırır.
 *
 * Kullanım:
 *   import { unwrapApi } from '@/lib/client/api-unwrap';
 *   const raw = await fetch('/api/...').then(r => r.json());
 *   const payload = unwrapApi<MyShape>(raw, 'requiredKey');
 *   if (!payload) return setError('Veri formatı tanınamadı');
 *
 * `requiredKey` opsiyonel: payload içinde olması beklenen typed discriminator
 * field. Verilirse, içermeyen shape `null` döner — schema mismatch erken yakalanır.
 */
export interface ApiEnvelope<T = unknown> {
 data?: T | { success?: boolean; data?: T; error?: string; [k: string]: unknown };
 meta?: { timestamp?: string; requestId?: string };
 success?: boolean;
 error?: string | { code?: string; message?: string };
 [k: string]: unknown;
}

export function unwrapApi<T = unknown>(raw: unknown, requiredKey?: keyof T): T | null {
 if (!raw || typeof raw !== 'object') return null;
 const r = raw as ApiEnvelope<T>;

 // Shape 1: { data: { success, data: T } } — double-wrap
 const inner = r.data as { success?: boolean; data?: T } | undefined;
 if (inner && typeof inner === 'object' && 'data' in inner && inner.data) {
  if (!requiredKey || (requiredKey as string) in (inner.data as object)) {
   return inner.data as T;
  }
 }

 // Shape 2: { data: T } — single wrap (envelope-only)
 if (r.data && typeof r.data === 'object') {
  if (!requiredKey || (requiredKey as string) in (r.data as object)) {
   return r.data as T;
  }
 }

 // Shape 3: { success, data: T } — payload directly (no envelope)
 if ('success' in r && 'data' in r && r.data) {
  if (!requiredKey || (requiredKey as string) in (r.data as object)) {
   return r.data as T;
  }
 }

 // Shape 4: raw payload directly
 if (!requiredKey || (requiredKey as string) in (r as object)) {
  return r as unknown as T;
 }

 return null;
}

/**
 * Liste endpoint'leri için convenience helper: array key'i otomatik bulur.
 * Örn: `{ data: { users: [...] } }` → `unwrapList(raw, 'users')` → `T[]`.
 */
export function unwrapList<T>(raw: unknown, arrayKey: string): T[] {
 if (!raw || typeof raw !== 'object') return [];

 const tryPaths = [
  (raw as any)?.data?.data?.[arrayKey],
  (raw as any)?.data?.[arrayKey],
  (raw as any)?.[arrayKey],
 ];

 for (const candidate of tryPaths) {
  if (Array.isArray(candidate)) return candidate as T[];
 }

 return [];
}

/**
 * API error mesajı çıkarma — multiple error shape destekler.
 */
export function unwrapError(raw: unknown): string | null {
 if (!raw || typeof raw !== 'object') return null;
 const r = raw as ApiEnvelope;

 if (typeof r.error === 'string') return r.error;
 if (typeof r.error === 'object' && r.error && 'message' in r.error) {
  return String(r.error.message);
 }
 const innerError = (r.data as any)?.error;
 if (typeof innerError === 'string') return innerError;
 if (typeof innerError === 'object' && innerError?.message) return String(innerError.message);

 return null;
}
