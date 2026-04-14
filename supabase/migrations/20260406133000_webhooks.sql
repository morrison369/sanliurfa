-- Webhook system tables

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_triggered TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_status ON webhooks(status);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- Enable RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own webhooks"
  ON webhooks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM webhooks WHERE id = webhook_deliveries.webhook_id
  ));
