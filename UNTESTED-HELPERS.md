# Untested Helpers Inventory

**Date:** 2026-05-05  
**Total source files in `src/lib/`:** 399  
**Test files:** 324  
**Untested files:** 75 (18.8%)

---

## Classification Guide

- **[db-mock]** — Direct DB access (query/queryOne/insert/update). Highest priority — data mutation logic.
- **[manager]** — Singleton classes with in-memory state (Map, array, registry). Medium priority.
- **[orchestrator]** — Multi-step logic composing helpers (300+ lines, 5+ imports). Integration test priority.
- **[external]** — External API calls (fetch, Stripe, Resend). Mock API tests needed.
- **[trivial]** — Simple helpers (100-300 lines). Low priority.
- **[stub]** — Type exports, minimal stubs (<100 lines). Lowest priority.

---

## UNTESTED HELPERS BY CLASSIFICATION

### [db-mock] — Direct Database Access — PRIORITY 1

| Source File | Lines | Description |
|---|---|---|
| `src/lib/admin/message-status.ts` | 43 | Message status DB updates |
| `src/lib/admin/events-admin.ts` | 116 | Admin event CRUD |
| `src/lib/activity/activity.ts` | 159 | Activity tracking insert/query |
| `src/lib/analytics/heatmaps.ts` | 153 | Heatmap data queries |
| `src/lib/api/api-keys.ts` | 221 | API key storage & validation |
| `src/lib/admin/export-tokens.ts` | 325 | Export token generation storage |
| `src/lib/api/api-gateway.ts` | 341 | API routing with DB checks |
| `src/lib/analytics/analytics.ts` | 336 | Analytics queries aggregation |
| `src/lib/admin/historical-sites-admin.ts` | 137 | Historical sites admin queries |
| `src/lib/ai/recommendations.ts` | 432 | Recommendation engine with DB |
| `src/lib/analytics-realtime/index.ts` | 255 | Real-time analytics DB layer |
| `src/lib/activity/index.ts` | 372 | Activity index with DB queries |
| `src/lib/admin/stats.ts` | 424 | Dashboard statistics queries |
| `src/lib/admin/widgets.ts` | 380 | Admin widget data queries |
| `src/lib/analytics/dashboard.ts` | 489 | Dashboard query aggregation |
| `src/lib/analytics/business-analytics.ts` | 1027 | **LARGEST UNTESTED** place analytics queries |

**Test Pattern:** Mock postgres module. Test cache invalidation, NULL aggregation, pagination.

---

### [manager] — In-Memory State Management

*(No files detected in untested set)*

---

### [orchestrator] — Multi-Step Logic Composition

| Source File | Lines | Description |
|---|---|---|
| `src/lib/ai/ai-agents.ts` | 366 | AgentManager and ConversationManager |
| `src/lib/ai/ai-chatbot.ts` | 316 | Chatbot session orchestration |
| `src/lib/ai/ai-inventory-planning.ts` | 301 | Inventory forecasting composition |
| `src/lib/analytics/analytics-reporting.ts` | 422 | Report generation multi-query |
| `src/lib/analytics/google-analytics.ts` | 333 | GA4 integration event batching |
| `src/lib/api/api-marketplace.ts` | 355 | Marketplace API routing |
| `src/lib/api.ts` | 452 | **CORE API HELPERS** apiResponse apiError safeErrorDetail |

**Test Pattern:** Test composition order, state mutations, async sequencing.

---

### [external] — External API Dependency

| Source File | Lines | Description |
|---|---|---|
| `src/lib/api/api-documentation.ts` | 502 | OpenAPI doc generation |

**Test Pattern:** Mock fetch. Test URL construction, header validation.

---

### [trivial] — Simple Helpers

| Source File | Lines | Description |
|---|---|---|
| `src/lib/account/index.ts` | 2 | Re-export |
| `src/lib/achievements/index.ts` | 2 | Re-export |
| `src/lib/admin/index.ts` | 6 | Re-export |
| `src/lib/api/index.ts` | 9 | Re-export |
| `src/lib/ai/index.ts` | 9 | Re-export |
| `src/lib/api/api-legacy.ts` | 21 | Legacy API layer |
| `src/lib/analytics/index.ts` | 25 | Re-export |
| `src/lib/api/api-versioning.ts` | 33 | Version resolution |
| `src/lib/api/versioning.ts` | 35 | Version parsing |
| `src/lib/api/marketplace.ts` | 38 | Marketplace constants |
| `src/lib/ai/ai-governance.ts` | 44 | Stub class stubs |
| `src/lib/accessibility/index.ts` | 64 | a11y utility functions |
| `src/lib/analytics/revenue-intelligence.ts` | 145 | Revenue trend helpers |
| `src/lib/analytics/behavioral-analytics.ts` | 218 | Behavioral event classification |
| `src/lib/ai/ai-ops.ts` | 221 | AI operational helpers |
| `src/lib/analytics/supply-chain-analytics.ts` | 263 | Supply chain metrics |

**Test Pattern:** Basic unit tests, constants validation.

---

## Test Writing Priority

1. **CRITICAL:** `src/lib/analytics/business-analytics.ts` (1027 lines, most DB logic)
2. **HIGH:** `src/lib/api.ts` (core helpers foundation)
3. **MEDIUM:** `src/lib/ai/ai-agents.ts` (singleton state management)
4. **LOW:** Re-export and stub modules

---

## Tested Files (Reference)

- `src/lib/achievements/achievements.ts` ← `achievements-pure.test.ts`
- `src/lib/admin/admin-dashboard.ts` ← `admin-dashboard-pure.test.ts`
- `src/lib/badges/badges.ts` ← `badges-pure.test.ts`
- `src/lib/cache/advanced.ts` ← `cache-advanced-managers.test.ts`

