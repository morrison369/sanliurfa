# Webhook Security Policy

## Baseline Controls
1. Signature verification is mandatory for external webhook providers.
2. Replay queue must enforce idempotency by `(webhook_id, event_id)` for pending/completed statuses.
3. Audit payloads must redact sensitive fields (`authorization`, `token`, `password`, `secret`).
4. Oversized payloads are truncated before persistence.

## Operational Controls
1. Failed webhook retries must be explicit and observable.
2. Delivery latency metrics must be SQL-based, not synthetic placeholders.
3. Incident logs must avoid PII and secrets.

## Verification
- `src/lib/__tests__/api-legacy.test.ts`
- webhook replay and audit code review in PR checklist
