// Webhook module - tam toolkit (analytics, audit, filters, logs, queue, replay, templates)
//
// SCOPE (singular `webhook/`):
//   - registerWebhook/triggerWebhook (yeni şema: `event: string` tek event, `active: boolean`)
//   - Tam yönetim toolkit'i: filtreler, retry/replay, audit log, analytics, template engine
//   - API katmanı: 11 endpoint (`api/webhooks/*`)
//
// PARALEL MODÜL: `lib/webhooks/` (plural, tek dosya) — DIFFERENT şema (`events: string[]`
// çoklu event + `status: 'active'|'paused'|'disabled'` + `retry_count` numerik). Sadece
// admin/social/risk endpoint'lerinden çağrılır; SSRF defense (HARD RULE #33) ve dinamik
// kolon allowlist (`getWebhookColumns`) ile farklı bir use-case'i kapsar. İki modülün
// `Webhook` interface'i UYUMSUZ — birinden diğerine type cast yapmayın.
export * from './webhook-analytics';
export * from './webhook-audit';
export * from './webhook-filters';
export * from './webhook-logs';
export * from './webhook-queue';
export * from './webhook-replay';
export * from './webhooks';
export * from './webhook-templates';
