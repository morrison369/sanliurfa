-- Email Marketing Migration
CREATE TABLE IF NOT EXISTS email_campaigns (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, subject TEXT NOT NULL, preheader TEXT,
  html_content TEXT NOT NULL, text_content TEXT,
  type TEXT NOT NULL CHECK (type IN ('newsletter', 'promotional', 'transactional', 'automation', 'abandoned_cart')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  segment_id TEXT, from_name TEXT NOT NULL DEFAULT 'Şanlıurfa.com',
  from_email TEXT NOT NULL DEFAULT 'noreply@sanliurfa.com', reply_to TEXT,
  scheduled_at TIMESTAMP, sent_at TIMESTAMP, total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0, open_count INTEGER DEFAULT 0, click_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0, unsubscribe_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_segments (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}', user_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened')),
  send_at TIMESTAMP, sent_at TIMESTAMP, opened_at TIMESTAMP, clicked_at TIMESTAMP,
  variant_id TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_link_clicks (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, url TEXT NOT NULL, clicked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_automation_workflows (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN ('user_registered', 'user_inactive', 'birthday', 'place_visited', 'review_posted', 'subscription_expiring', 'abandoned_cart', 'custom_event')),
  trigger_config JSONB NOT NULL DEFAULT '{}', steps JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft', 'archived')),
  entry_count INTEGER DEFAULT 0, complete_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_automation_entries (
  id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL REFERENCES email_automation_workflows(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, current_step_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'error')),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(), completed_at TIMESTAMP, metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS email_automation_queue (
  id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, workflow_id TEXT NOT NULL,
  user_id TEXT NOT NULL, step_id TEXT NOT NULL, run_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, activity_score INTEGER DEFAULT 0,
  last_active_at TIMESTAMP, email_opens INTEGER DEFAULT 0, email_clicks INTEGER DEFAULT 0,
  places_visited INTEGER DEFAULT 0, reviews_posted INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_campaign_recipients_campaign ON email_campaign_recipients(campaign_id);
CREATE INDEX idx_automation_queue_run_at ON email_automation_queue(run_at);
