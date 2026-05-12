# Webhook System Documentation

**Status**: ✅ Production Ready (April 8, 2026)

Complete webhook system for event-driven integrations with HMAC-SHA256 security, analytics, and management UI.

## Overview

Webhooks allow you to receive real-time HTTP POST notifications when specific events occur in Şanlıurfa.com. Use webhooks to:
- Sync data with external systems
- Trigger workflows in third-party apps
- Build real-time integrations
- Monitor platform activity

## Quick Start

### 1. Create a Webhook

```bash
curl -X POST https://sanliurfa.com/api/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "place.created",
    "url": "https://yourapp.com/webhooks/places",
    "secret": "optional-secret-key"
  }'
```

### 2. Receive and Verify

```python
from flask import Flask, request
import hmac
import hashlib
import json

app = Flask(__name__)
SECRET = 'optional-secret-key'

@app.route('/webhooks/places', methods=['POST'])
def handle_webhook():
    # Verify signature
    signature = request.headers.get('X-Signature')
    payload = request.get_data(as_text=True)

    expected_sig = hmac.new(
        SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    if signature != expected_sig:
        return {'error': 'Invalid signature'}, 401

    # Process event
    data = request.json
    print(f"Received {data['event']} event")

    return {'status': 'ok'}, 200
```

### 3. Monitor in Dashboard

Visit `/webhooks` to:
- View all your webhooks
- See delivery success rates
- Test webhooks with sample data
- Retry failed deliveries
- Monitor analytics

## Supported Events

| Event | Trigger |
|-------|---------|
| `place.created` | New place added |
| `place.updated` | Place information updated |
| `place.deleted` | Place removed |
| `review.created` | New review posted |
| `review.deleted` | Review removed |
| `user.registered` | New user sign-up |
| `user.blocked` | User blocked another user |
| `message.sent` | Direct message sent |

## API Endpoints

### List Webhooks

```bash
GET /api/webhooks
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "event": "place.created",
      "url": "https://yourapp.com/webhook",
      "active": true,
      "createdAt": "2026-04-08T12:00:00Z"
    }
  ]
}
```

### Create Webhook

```bash
POST /api/webhooks
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "event": "place.created",
  "url": "https://yourapp.com/webhook",
  "secret": "optional-secret"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "webhook-uuid",
    "event": "place.created",
    "url": "https://yourapp.com/webhook",
    "active": true,
    "createdAt": "2026-04-08T12:00:00Z"
  }
}
```

### Delete Webhook

```bash
DELETE /api/webhooks/{webhook-id}
Authorization: Bearer TOKEN

Response: 200 OK
{
  "success": true,
  "message": "Webhook deleted successfully"
}
```

### Get Analytics

```bash
GET /api/webhooks/analytics
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": {
    "totalWebhooks": 5,
    "totalEvents": 1234,
    "deliveredEvents": 1200,
    "failedEvents": 34,
    "pendingEvents": 0,
    "successRate": 97.24,
    "byEvent": {
      "place.created": {
        "total": 200,
        "delivered": 198,
        "failed": 2,
        "successRate": 99.0
      }
    },
    "topFailedEvents": [
      {
        "event": "review.created",
        "failedCount": 20,
        "attempts": 60
      }
    ]
  }
}
```

### Test Webhook

```bash
POST /api/webhooks/test
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "webhookId": "webhook-uuid",
  "testData": {
    "custom": "data"
  }
}

Response:
{
  "success": true,
  "message": "Test webhook sent successfully",
  "data": {
    "webhookId": "webhook-uuid",
    "event": "place.created",
    "url": "https://yourapp.com/webhook",
    "sentAt": "2026-04-08T12:00:00Z"
  }
}
```

### Retry Failed Events

```bash
POST /api/webhooks/retry
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "webhookId": "webhook-uuid"
}

Response:
{
  "success": true,
  "message": "5 failed event(s) queued for retry",
  "data": {
    "retriedCount": 5
  }
}
```

## Webhook Request Format

All webhook requests follow this format:

```json
{
  "id": "event-uuid",
  "event": "place.created",
  "timestamp": "2026-04-08T12:00:00Z",
  "data": {
    "id": "place-uuid",
    "name": "Göbekli Tepe",
    "category": "historical",
    "latitude": 37.223,
    "longitude": 38.763
  }
}
```

### Headers

```
Content-Type: application/json
X-Signature: sha256=<HMAC-SHA256-SIGNATURE>
X-Request-ID: <unique-request-id>
User-Agent: SanliurfaWebhooks/1.0
```

## Signature Verification

All webhook payloads are signed using HMAC-SHA256. To verify:

1. Get the `X-Signature` header value
2. Compute `HMAC-SHA256(json_payload, your_secret)`
3. Compare the values

### Examples

**Node.js**
```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expected;
}
```

**Python**
```python
import hmac
import hashlib
import json

def verify_signature(payload, signature, secret):
    if isinstance(payload, dict):
        payload = json.dumps(payload)

    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return signature == expected
```

**PHP**
```php
function verifySignature($payload, $signature, $secret) {
    if (is_array($payload)) {
        $payload = json_encode($payload);
    }

    $expected = hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expected);
}
```

## Retry Logic

Failed webhook deliveries are automatically retried with exponential backoff:

- **Attempt 1**: Immediate (0 seconds)
- **Attempt 2**: 1 minute delay
- **Attempt 3**: 4 minutes delay
- **Attempt 4+**: Marked as failed

Maximum 3 retry attempts. After that, the event is marked as permanently failed.

You can manually retry failed events via `/api/webhooks/retry`.

## Response Requirements

Your webhook endpoint must:

1. **Return 2xx status code** (200-299)
   - Only success codes (200-299) are considered delivered
   - Any other code triggers a retry

2. **Respond within 30 seconds**
   - Slow endpoints may timeout and be retried

3. **Be HTTPS**
   - HTTP endpoints are rejected
   - Valid SSL certificate required

4. **Handle duplicates**
   - Same event may be received multiple times
   - Use event ID for deduplication

## Best Practices

### 1. Verify Signatures

Always verify the `X-Signature` header to ensure requests come from Şanlıurfa.com.

### 2. Use Event IDs

Each event has a unique ID. Store these to avoid processing duplicates:

```python
processed_events = set()

if event['id'] in processed_events:
    return {'status': 'ok'}, 200  # Already processed

processed_events.add(event['id'])
# Process event...
```

### 3. Respond Quickly

Return 2xx immediately, then process asynchronously:

```python
@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json

    # Return immediately
    response = {'status': 'ok'}

    # Process asynchronously
    queue.enqueue(process_webhook, data)

    return response, 202  # 202 Accepted
```

### 4. Log Everything

Track webhook activity:

```python
import logging

logger = logging.getLogger(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    event = request.json

    logger.info(f"Received webhook: {event['event']}", extra={
        'event_id': event['id'],
        'event_type': event['event'],
        'timestamp': event['timestamp']
    })

    try:
        process(event)
        logger.info("Webhook processed successfully")
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise
```

### 5. Set Reasonable Timeouts

Configure appropriate timeouts for webhook processing:

```python
import requests

response = requests.post(
    webhook_url,
    json=payload,
    headers=headers,
    timeout=30  # 30 second timeout
)
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook is active**: Visit `/webhooks` and verify status
2. **Test webhook**: Use "Test" button to send sample event
3. **Check URL**: Ensure URL is valid HTTPS with proper certificate
4. **Check firewall**: Ensure you're not blocking requests from Şanlıurfa.com

### High Failure Rate

1. **Check analytics**: Visit `/webhooks` analytics tab
2. **Review error logs**: Look at failed event details
3. **Check timeout**: Ensure endpoint responds within 30 seconds
4. **Verify signature**: Ensure signature verification is correct

### Missing Events

1. **Check webhook creation**: Confirm webhook created for specific event
2. **Check logs**: Review failed events in dashboard
3. **Verify permissions**: User must own the webhook
4. **Check storage**: Ensure endpoint is storing events

## Database Schema

### webhooks table

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  event VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255),
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### webhook_events table

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  webhook_id UUID NOT NULL,
  event VARCHAR(100) NOT NULL,
  data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  next_retry_at TIMESTAMP,
  response_code INT,
  delivery_time_ms INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Rate Limits

Webhook operations are rate-limited:

- **Create webhook**: 10 per hour per user
- **Test webhook**: 100 per hour per user
- **Retry webhooks**: 50 per hour per user
- **Delete webhook**: Unlimited
- **List webhooks**: Unlimited
- **Analytics**: Unlimited (cached 5 minutes)

Webhook *deliveries* are not rate-limited - all events are processed as fast as possible.

## Compliance

### GDPR

- Users can delete their account, which automatically deletes all webhooks
- Webhook events are retained for 90 days by default
- Can be cleared via `/api/webhooks/cleanup` (admin)

### Security

- All data in transit uses HTTPS
- Webhook payloads can contain PII - treat as sensitive
- Never share webhook URLs or secrets publicly
- Rotate secrets regularly

## Future Enhancements

Planned features:

- [ ] Webhook filters (conditional delivery)
- [ ] Event replay (resend historical events)
- [ ] Webhook transformations (map fields)
- [ ] Batch delivery mode
- [ ] Rate limiting per webhook
- [ ] Real-time webhook testing UI
- [ ] Advanced retry policies
- [ ] Webhook middleware/middleware chains

## Support

For issues or questions:

1. Check this documentation
2. Visit `/webhooks` page for self-service testing
3. Review analytics dashboard for error details
4. Contact support with webhook ID and event details

---

**Version**: 1.0
**Last Updated**: April 8, 2026
**Status**: Production Ready ✅
