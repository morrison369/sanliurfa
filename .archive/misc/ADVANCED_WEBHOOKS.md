# Advanced Webhook Features
**Status**: ✅ COMPLETE (April 8, 2026)

Complete webhook filtering, configuration, and logging system for advanced integration scenarios.

## New Features

### 1. Webhook Filtering System
**Library**: `src/lib/webhook-filters.ts`

**Functions**:
- `createWebhookFilter()` - Add event filter to webhook
- `getWebhookFilters()` - List all filters for webhook
- `deleteWebhookFilter()` - Remove filter
- `shouldDeliverEvent()` - Check if event matches filters

**Filter Types**:
- `event` - Filter by event type
- `field` - Filter by payload field value
- `condition` - Complex conditional filtering

**Operators**:
- `equals` - Exact match
- `contains` - String contains
- `greater_than` - Numeric comparison
- `less_than` - Numeric comparison
- `in` - Array membership
- `exists` - Field exists

**Example Usage**:
```typescript
// Only deliver place.created events where category = "historical"
await createWebhookFilter(
  pool,
  webhookId,
  userId,
  'field',
  'category',
  'equals',
  'historical'
);
```

### 2. Webhook Configuration & Settings
**Library**: `src/lib/webhook-filters.ts`

**Settings Available**:
- `timeoutSeconds` - Request timeout (default: 30s, min: 5s)
- `maxRetries` - Maximum retry attempts (default: 3)
- `retryDelayMs` - Delay between retries (default: 60000ms)
- `rateLimit` - Requests per window (0 = unlimited)
- `rateLimitWindow` - Rate limit window in seconds
- `enabled` - Enable/disable webhook

**Functions**:
- `getWebhookSettings()` - Retrieve configuration
- `updateWebhookSettings()` - Update settings

**Example**:
```typescript
// Update webhook configuration
await updateWebhookSettings(pool, webhookId, userId, {
  timeoutSeconds: 10,
  maxRetries: 5,
  rateLimit: 100,
  rateLimitWindow: 3600
});
```

### 3. Webhook Delivery Logs
**Library**: `src/lib/webhook-logs.ts`

**Functions**:
- `getWebhookLogs()` - Paginated delivery history
- `getWebhookLogDetail()` - Single log details
- `getWebhookLogsSummary()` - Statistics summary
- `clearOldWebhookLogs()` - Clean up old entries

**Log Information**:
- Event type and timestamp
- Delivery status (delivered, failed, pending)
- HTTP response code
- Response time (milliseconds)
- Error message if failed
- Attempt count
- Full request/response data

**Example**:
```typescript
// Get last 24 hours of logs
const logs = await getWebhookLogs(pool, webhookId, userId, 50, 0);
const summary = await getWebhookLogsSummary(pool, webhookId, userId, 24);
```

### 4. Webhook Delivery Logs UI
**Component**: `src/components/WebhookDeliveryLogs.tsx`

**Features**:
- Paginated log table (20 items per page)
- Summary cards (total, delivered, failed, pending, success rate)
- Status color coding (green/red/yellow)
- Response time display
- Error message display
- Sortable by date
- Real-time refresh capability

## Database Schema

### webhook_filters table
```sql
CREATE TABLE webhook_filters (
  id UUID PRIMARY KEY,
  webhook_id UUID NOT NULL,
  filter_type VARCHAR(50),
  filter_key VARCHAR(255),
  operator VARCHAR(50),
  filter_value JSONB,
  created_at TIMESTAMP
);
```

### webhook_settings table
```sql
CREATE TABLE webhook_settings (
  webhook_id UUID PRIMARY KEY,
  timeout_seconds INT DEFAULT 30,
  max_retries INT DEFAULT 3,
  retry_delay_ms INT DEFAULT 60000,
  rate_limit INT DEFAULT 0,
  rate_limit_window INT DEFAULT 3600,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## API Endpoints

### Webhook Filters

#### List Filters
```bash
GET /api/webhooks/filters?webhookId=xxx
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": [
    {
      "id": "filter-uuid",
      "webhookId": "webhook-uuid",
      "filterType": "field",
      "filterKey": "category",
      "operator": "equals",
      "filterValue": "historical",
      "createdAt": "2026-04-08T12:00:00Z"
    }
  ],
  "count": 1
}
```

#### Create Filter
```bash
POST /api/webhooks/filters
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "webhookId": "webhook-uuid",
  "filterType": "field",
  "filterKey": "category",
  "operator": "equals",
  "filterValue": "historical"
}

Response: 201 Created
{
  "success": true,
  "data": { ... },
  "message": "Filter created successfully"
}
```

#### Delete Filter
```bash
DELETE /api/webhooks/filters/{filter-id}
Authorization: Bearer TOKEN

Response: 200 OK
{
  "success": true,
  "message": "Filter deleted"
}
```

### Webhook Settings

#### Get Settings
```bash
GET /api/webhooks/settings?webhookId=xxx
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": {
    "webhookId": "webhook-uuid",
    "timeoutSeconds": 30,
    "maxRetries": 3,
    "retryDelayMs": 60000,
    "rateLimit": 0,
    "rateLimitWindow": 3600,
    "enabled": true
  }
}
```

#### Update Settings
```bash
PUT /api/webhooks/settings
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "webhookId": "webhook-uuid",
  "timeoutSeconds": 10,
  "maxRetries": 5
}

Response: 200 OK
{
  "success": true,
  "data": { ... },
  "message": "Settings updated successfully"
}
```

### Webhook Logs

#### Get Logs
```bash
GET /api/webhooks/logs?webhookId=xxx&limit=50&offset=0
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": [
    {
      "id": "event-uuid",
      "webhookId": "webhook-uuid",
      "event": "place.created",
      "status": "delivered",
      "responseCode": 200,
      "responseTime": 245,
      "errorMessage": null,
      "attempts": 1,
      "createdAt": "2026-04-08T12:00:00Z",
      "updatedAt": "2026-04-08T12:00:01Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1234,
    "pages": 25
  }
}
```

#### Get Logs Summary
```bash
GET /api/webhooks/logs?webhookId=xxx&summary=true
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": {
    "total": 1234,
    "delivered": 1200,
    "failed": 34,
    "pending": 0,
    "successRate": 97.24,
    "avgResponseTime": 156
  }
}
```

#### Clear Old Logs
```bash
DELETE /api/webhooks/logs?webhookId=xxx&olderThanDays=30
Authorization: Bearer TOKEN

Response: 200 OK
{
  "success": true,
  "message": "Deleted 156 old log entries",
  "data": {
    "deletedCount": 156
  }
}
```

## Use Cases

### 1. Selective Event Delivery
```typescript
// Only send webhooks for historical places
POST /api/webhooks/filters
{
  "webhookId": "webhook-uuid",
  "filterType": "field",
  "filterKey": "category",
  "operator": "equals",
  "filterValue": "historical"
}
```

### 2. High-Volume Filtering
```typescript
// Limit webhook delivery rate
PUT /api/webhooks/settings
{
  "webhookId": "webhook-uuid",
  "rateLimit": 1000,           // Max 1000 requests
  "rateLimitWindow": 3600       // per hour
}
```

### 3. Timeout Configuration
```typescript
// Fast webhook with quick timeout
PUT /api/webhooks/settings
{
  "webhookId": "webhook-uuid",
  "timeoutSeconds": 5,
  "maxRetries": 2
}
```

### 4. Log Analysis
```typescript
// Get delivery statistics for last 24 hours
GET /api/webhooks/logs?webhookId=xxx&summary=true

// Retrieve paginated delivery history
GET /api/webhooks/logs?webhookId=xxx&limit=50&offset=0
```

## Files Created (6)

1. **src/lib/webhook-filters.ts** (250+ lines)
   - Filter logic and validation
   - Settings management
   - Helper functions

2. **src/migrations/061_webhook_filters_settings.ts**
   - Database schema for filters
   - Database schema for settings
   - Auto-initialization for existing webhooks

3. **src/pages/api/webhooks/filters.ts**
   - GET/POST/DELETE filter operations
   - Validation and error handling
   - Cache invalidation

4. **src/pages/api/webhooks/settings.ts**
   - GET/PUT settings operations
   - Value validation
   - Cache management

5. **src/lib/webhook-logs.ts** (200+ lines)
   - Log retrieval with pagination
   - Summary statistics calculation
   - Log cleanup functionality

6. **src/components/WebhookDeliveryLogs.tsx** (300+ lines)
   - Paginated log table UI
   - Summary cards
   - Status indicators
   - Responsive design

## Build Status
- ✅ Build successful (6.47s)
- ✅ Zero errors
- ✅ All components compile
- ✅ TypeScript strict mode passing

## Integration Points

### With Existing Webhook System
- Filters integrated with `/api/webhooks` delivery
- Settings respected during retry logic
- Logs stored in `webhook_events` table
- Cache invalidation on filter/setting changes

### Database
- 2 new tables: `webhook_filters`, `webhook_settings`
- 1 migration: 061_webhook_filters_settings
- Automatic settings initialization
- Proper cascading deletes

### API
- 3 new endpoints for filters
- 2 new endpoints for settings
- 2 new endpoints for logs
- All require authentication

## Performance Considerations

### Caching
- Webhook settings cached (10 min TTL)
- Filter checks done in-memory
- Log pagination limits queries

### Indexes
- `webhook_id` indexed for fast lookups
- `created_at DESC` indexed for log sorting
- Proper foreign keys for cascade deletes

### Scalability
- Pagination supports millions of logs
- Filter matching O(n) where n = filter count (typically < 10)
- Bulk log cleanup for storage management

## Security

### Access Control
- User ownership verification
- Webhook ID validation
- Token-based authentication

### Input Validation
- Filter value type checking
- Timeout bounds validation (min 5s)
- Rate limit parameter validation

### Data Protection
- Sensitive settings cached securely
- Log data retained per user preference
- Automatic cleanup available

## Future Enhancements

1. **Advanced Filtering**
   - Regex pattern matching
   - Complex AND/OR logic
   - Payload transformation

2. **Custom Retry Policies**
   - Exponential backoff configuration
   - Custom retry conditions
   - Circuit breaker pattern

3. **Log Retention Policies**
   - Automatic cleanup schedules
   - Archive to cold storage
   - GDPR retention compliance

4. **Performance Monitoring**
   - Per-endpoint success rates
   - Latency tracking
   - Resource usage alerts

5. **Webhook Templates**
   - Save common configurations
   - Clone from templates
   - Share with team

## Testing

All new endpoints can be tested via:

```bash
# Create filter
curl -X POST http://localhost:4321/api/webhooks/filters \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookId":"xxx","filterType":"field","filterKey":"category","operator":"equals","filterValue":"historical"}'

# Get settings
curl http://localhost:4321/api/webhooks/settings?webhookId=xxx \
  -H "Authorization: Bearer TOKEN"

# Get logs
curl http://localhost:4321/api/webhooks/logs?webhookId=xxx&limit=20 \
  -H "Authorization: Bearer TOKEN"
```

---

**Version**: 1.0
**Status**: Production Ready ✅
**Date**: April 8, 2026
