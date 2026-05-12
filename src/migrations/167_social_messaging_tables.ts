/**
 * Migration 167: Social messaging tables
 * Adds conversation_participants and messages tables used by social/messaging-db.ts.
 * Also updates conversations table with group support columns.
 */

import type { Migration } from '../lib/migrations';

export const migration_167_social_messaging_tables: Migration = {
  version: '167_social_messaging_tables',
  description: 'sosyal mesajlaşma tabloları (conversation_participants, messages)',

  up: async (pool: any) => {
    // Add group support to conversations (migration 027 created it without these)
    await pool.query(`
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_name VARCHAR(255);
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_avatar TEXT;
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // conversation_participants — normalized participant tracking with read state
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        last_read_at TIMESTAMP,
        UNIQUE(conversation_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conv_participants_user
        ON conversation_participants(user_id, last_read_at DESC);
      CREATE INDEX IF NOT EXISTS idx_conv_participants_conv
        ON conversation_participants(conversation_id);
    `);

    // Social messages table — richer schema used by messaging-db.ts
    // (distinct from the simple 'messages' table in migration 024)
    // migration 024 already created 'messages' with body/subject schema — use IF NOT EXISTS + ALTER TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        type VARCHAR(20) DEFAULT 'text',
        metadata JSONB,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        edited_at TIMESTAMP,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Ensure all social-messaging columns exist on the pre-existing table from migration 024
    await pool.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'text';
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(conversation_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_sender
        ON messages(sender_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_unread
        ON messages(conversation_id, is_read) WHERE is_read = false;
    `);

    // analytics_reports — analytics/business-analytics.ts and reporting/dashboard.ts use a 'reports'
    // table with analytics columns, but migration 031 created 'reports' for moderation.
    // analytics_reports is the correct separate table for these use cases.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        report_type VARCHAR(50),
        metric_ids JSONB,
        filters JSONB,
        schedule VARCHAR(50),
        next_run_at TIMESTAMP,
        format VARCHAR(50) DEFAULT 'pdf',
        recipients JSONB,
        is_active BOOLEAN DEFAULT true,
        type VARCHAR(50),
        query TEXT,
        parameters JSONB,
        tenant_id VARCHAR(255),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        last_run TIMESTAMP,
        last_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_reports_owner
        ON analytics_reports(owner_id, is_active, created_at DESC);
    `);

    // page_views — tracking/index.ts uses extra columns not in original schema
    await pool.query(`
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(255);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS path VARCHAR(500);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS ip VARCHAR(45);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS country VARCHAR(10);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS device VARCHAR(50);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS browser VARCHAR(100);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS os VARCHAR(100);
    `);

    // api_request_logs — used by admin/stats.ts and analytics/dashboard.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_request_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        method VARCHAR(10),
        path VARCHAR(500),
        status INTEGER,
        response_time_ms INTEGER,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_api_request_logs_created
        ON api_request_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_api_request_logs_status
        ON api_request_logs(status, created_at DESC);
    `);

    // tracked_events — used by tracking/index.ts trackEvent() function
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracked_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visitor_id VARCHAR(255),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(100),
        category VARCHAR(100),
        action VARCHAR(100),
        label VARCHAR(255),
        value NUMERIC,
        properties JSONB,
        session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tracked_events_session
        ON tracked_events(session_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tracked_events_type
        ON tracked_events(type, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tracked_events_visitor
        ON tracked_events(visitor_id, created_at DESC);
    `);

    // place_daily_analytics — share_count, save_count columns referenced in analytics/dashboard.ts
    await pool.query(`
      ALTER TABLE place_daily_analytics ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
      ALTER TABLE place_daily_analytics ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;
    `);

    // moderation_queue — missing columns referenced in moderation/index.ts
    await pool.query(`
      ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS moderator_id UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;
      ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS reject_reason TEXT;
    `);

    // notifications.read_at — migration 009 created table without this column
    await pool.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
    `);

    // email_queue missing columns — used by email/index.ts queueEmail()
    await pool.query(`
      ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS to_email VARCHAR(255);
      ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS html_content TEXT;
      ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS text_content TEXT;
    `);

    // analytics_events_realtime — used by analytics-engine/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events_realtime (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        properties JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_realtime_time
        ON analytics_events_realtime(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_realtime_type
        ON analytics_events_realtime(event_type, timestamp DESC);
    `);

    // social_shares — used by social/index.ts trackShare() and analytics/dashboard.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_type VARCHAR(50) NOT NULL,
        content_id VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        shared_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_shares_content
        ON social_shares(content_type, content_id, shared_at DESC);
      CREATE INDEX IF NOT EXISTS idx_social_shares_created
        ON social_shares(created_at DESC);
    `);

    // events — missing columns used by event-booking/index.ts and events-management.ts
    await pool.query(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
      ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS attendee_count INTEGER DEFAULT 0;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(100);
      ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS tags TEXT[];
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, start_date DESC);
    `);

    // event_tickets — used by event-booking/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'standard',
        price NUMERIC(10,2) DEFAULT 0,
        quantity INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'cancelled', 'used')),
        cancelled_at TIMESTAMP,
        booked_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_tickets_event ON event_tickets(event_id, status);
      CREATE INDEX IF NOT EXISTS idx_event_tickets_user ON event_tickets(user_id, booked_at DESC);
    `);

    // support_tickets — missing columns used by contact-submission.ts and admin/messages
    await pool.query(`
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS subject VARCHAR(500);
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS message TEXT;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS type VARCHAR(100);
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES places(id) ON DELETE SET NULL;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50);
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS response TEXT;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_ticket_number
        ON support_tickets(ticket_number) WHERE ticket_number IS NOT NULL;
    `);

    await pool.query(`
      UPDATE support_tickets SET ticket_number = 'TKT-' || UPPER(SUBSTRING(id::text, 1, 8)) WHERE ticket_number IS NULL;
    `);

    // reviews — missing columns used by admin/moderation.ts and reviews/index.ts
    await pool.query(`
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected', 'flagged', 'deleted'));
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images TEXT[];
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS visit_type VARCHAR(50);
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS visit_date DATE;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS unhelpful_count INTEGER DEFAULT 0;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_moderated BOOLEAN DEFAULT false;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status, created_at DESC);
    `);

    // blog_posts missing columns (migration 120 CREATE TABLE was no-op; ALTER TABLE didn't add all columns)
    await pool.query(`
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content_html TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_avatar VARCHAR(255);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS reading_time INTEGER DEFAULT 5;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
    `);

    // feature_flags missing columns
    await pool.query(`
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT false;
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS rollout_percentage INTEGER DEFAULT 100;
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS targeting_rules JSONB DEFAULT '[]';
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS allowed_users JSONB DEFAULT '[]';
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS allowed_groups JSONB DEFAULT '[]';
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS metadata JSONB;
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_name
        ON feature_flags(name) WHERE deleted_at IS NULL;
    `);

    // notifications.data — used by realtime/notifications.ts INSERT
    await pool.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;
    `);

    // user_badges — add missing columns (migration 011 created with badge_type only; badges.ts needs badge_id/unlock_reason/is_featured)
    await pool.query(`
      ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS badge_id UUID REFERENCES badges(id) ON DELETE CASCADE;
      ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS unlock_reason TEXT;
      ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
    `);

    // moderation_queue unique constraint — needed for ON CONFLICT in moderation/moderation.ts
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_moderation_queue_content_unique
        ON moderation_queue(content_type, content_id);
    `);

    // users.subscription_tier / subscription_id — used by admin/stats.ts and subscription/index.ts
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
    `);

    // subscriptions missing columns — used by subscription/index.ts
    await pool.query(`
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan VARCHAR(100);
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100);
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
    `);

    // scheduled_jobs — used by scheduler/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(100) NOT NULL,
        schedule VARCHAR(100),
        next_run TIMESTAMP,
        last_run TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        data JSONB,
        max_retries INTEGER DEFAULT 3,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run
        ON scheduled_jobs(next_run ASC) WHERE status = 'active';
    `);

    // activity_summaries — used by activity/index.ts updateActivitySummary()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        activity_type VARCHAR(100) NOT NULL,
        count INTEGER DEFAULT 1,
        last_activity_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date, activity_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_summaries_user
        ON activity_summaries(user_id, date DESC);
    `);

    // blog_likes — used by api/blog/admin.ts LEFT JOIN
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_likes_post
        ON blog_likes(post_id, created_at DESC);
    `);

    // comments.likes — used by comments/index.ts likeComment()
    await pool.query(`
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
    `);

    // comment_likes — used by comments/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(comment_id, user_id)
      )
    `);

    // email_verifications — used by email/index.ts requestEmailVerification()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
      CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
    `);

    // invoices — used by invoice/index.ts and subscription/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(100) PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
        invoice_number VARCHAR(100),
        issue_date TIMESTAMP,
        due_date TIMESTAMP,
        amount NUMERIC(10,2) DEFAULT 0,
        tax_rate NUMERIC(5,2) DEFAULT 0,
        tax_amount NUMERIC(10,2) DEFAULT 0,
        total_amount NUMERIC(10,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'TRY',
        status VARCHAR(50) DEFAULT 'pending',
        items JSONB,
        company_info JSONB,
        customer_info JSONB,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    `);

    // payments — used by payment/iyzico.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        payment_id VARCHAR(255) UNIQUE,
        amount NUMERIC(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'TRY',
        status VARCHAR(50) DEFAULT 'pending',
        provider VARCHAR(50),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
    `);

    // review_photos — used by reviews/enhanced.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        caption TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_photos_review ON review_photos(review_id);
    `);

    // review_helpful — used by reviews/enhanced.ts markHelpful()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_helpful (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(review_id, user_id)
      )
    `);

    // user_presence — used by collaboration-realtime/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_presence (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        status VARCHAR(50) DEFAULT 'online',
        current_page VARCHAR(500),
        last_seen TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // error_logs — used by error-tracking/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message TEXT NOT NULL,
        type VARCHAR(100),
        stack TEXT,
        context JSONB,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        tags JSONB,
        url VARCHAR(500),
        fingerprint VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON error_logs(fingerprint, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
    `);

    // heatmap_events — used by analytics/heatmaps.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS heatmap_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        page_url VARCHAR(500),
        element_path TEXT,
        x INTEGER,
        y INTEGER,
        type VARCHAR(50),
        session_id VARCHAR(255),
        viewport_width INTEGER,
        viewport_height INTEGER,
        device_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_heatmap_events_page ON heatmap_events(page_url, created_at DESC);
    `);

    // interactions — used by analytics.ts recordInteraction()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(100),
        element VARCHAR(255),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // share_counts — used by social/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS share_counts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_type VARCHAR(50) NOT NULL,
        content_id VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        count INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(content_type, content_id, platform)
      )
    `);

    // scheduled_notifications — used by notifications/index.ts and push/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        recipient VARCHAR(255),
        type VARCHAR(100),
        title VARCHAR(255),
        message TEXT,
        notification JSONB,
        data JSONB,
        priority VARCHAR(50) DEFAULT 'normal',
        scheduled_at TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled
        ON scheduled_notifications(scheduled_at ASC) WHERE status = 'pending';
    `);

    // bulk_operations — used by bulk/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bulk_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_ids JSONB,
        data JSONB,
        executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'running',
        result JSONB,
        error TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // job_logs — used by jobs/scheduler.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        success BOOLEAN NOT NULL,
        duration_ms INTEGER,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_job_logs_name ON job_logs(name, created_at DESC);
    `);

    // job_executions — used by scheduler/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'running',
        result JSONB,
        error TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_job_executions_job ON job_executions(job_id, started_at DESC);
    `);

    // newsletter_campaigns — used by newsletter/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject VARCHAR(500) NOT NULL,
        content_html TEXT,
        content_text TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        recipient_count INTEGER DEFAULT 0,
        open_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // push_notification_logs — used by push/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_notification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
        title VARCHAR(255),
        sent_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50),
        error TEXT
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_notification_logs_user
        ON push_notification_logs(user_id, sent_at DESC);
    `);

    // alert_rules — used by monitoring/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        metric VARCHAR(100),
        condition VARCHAR(20),
        threshold NUMERIC,
        duration INTEGER,
        severity VARCHAR(50),
        notification_channels JSONB,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // active_alerts — used by monitoring/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS active_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id VARCHAR(100) REFERENCES alert_rules(id) ON DELETE CASCADE,
        metric_value NUMERIC,
        triggered_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        severity VARCHAR(50)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_active_alerts_rule
        ON active_alerts(rule_id, triggered_at DESC);
      CREATE INDEX IF NOT EXISTS idx_active_alerts_unresolved
        ON active_alerts(rule_id) WHERE resolved_at IS NULL;
    `);

    // alert_notifications — used by monitoring/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id VARCHAR(100) REFERENCES alert_rules(id) ON DELETE SET NULL,
        message TEXT,
        severity VARCHAR(50),
        sent_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // backup_configs + backups tabloları kaldırıldı — migration 169'da drop edildi
    // (feature production'da hiç aktive edilmedi, kod tamamen silindi).

    // recommendation_feedback — used by ai/recommendations.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recommendation_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        item_id VARCHAR(255) NOT NULL,
        item_type VARCHAR(100),
        recommendation_score NUMERIC,
        feedback VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user
        ON recommendation_feedback(user_id, created_at DESC);
    `);

    // recommendation_weights — used by ai/recommendations.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recommendation_weights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(100),
        reason VARCHAR(100),
        weight_delta NUMERIC DEFAULT 0,
        UNIQUE(user_id, item_type, reason)
      )
    `);

    // report_executions — used by analytics/business-analytics.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS report_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID REFERENCES analytics_reports(id) ON DELETE CASCADE,
        execution_time TIMESTAMP DEFAULT NOW(),
        duration_ms INTEGER,
        status VARCHAR(50),
        data_rows INTEGER DEFAULT 0,
        file_path TEXT,
        sent_to JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_report_executions_report
        ON report_executions(report_id, execution_time DESC);
    `);

    // error_fingerprints — used by error-tracking/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS error_fingerprints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fingerprint VARCHAR(255) NOT NULL UNIQUE,
        count INTEGER DEFAULT 1,
        first_seen TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'unresolved'
      )
    `);

    // saved_searches — used by saved/saved-searches.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255),
        query TEXT,
        filters JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_user
        ON saved_searches(user_id, created_at DESC);
    `);

    // tenant_users — used by multi-tenant/index.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant
        ON tenant_users(tenant_id, role);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_user
        ON tenant_users(user_id);
    `);

    // user_match_profiles — used by social/matchmaking-db.ts
    // photos: TEXT[] (NOT JSONB) — matchmaking-db candidate query uses cardinality(mp.photos)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_match_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT DEFAULT '',
        photos TEXT[] DEFAULT '{}',
        is_discoverable BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Fix existing prod tables that were created with JSONB before this fix
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_match_profiles'
            AND column_name = 'photos'
            AND data_type = 'jsonb'
        ) THEN
          ALTER TABLE user_match_profiles
            ALTER COLUMN photos DROP DEFAULT,
            ALTER COLUMN photos TYPE TEXT[]
              USING (
                CASE
                  WHEN photos IS NULL OR photos::text = 'null' THEN '{}'::text[]
                  ELSE ARRAY(SELECT jsonb_array_elements_text(photos))
                END
              ),
            ALTER COLUMN photos SET DEFAULT '{}';
        END IF;
      END $$;
    `);

    // webhook_delivery_queue — used by webhook/webhook-queue.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_delivery_queue (
        id VARCHAR(100) PRIMARY KEY,
        webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
        payload TEXT,
        url TEXT NOT NULL,
        headers TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        next_retry_at TIMESTAMP,
        delivered_at TIMESTAMP,
        dlq_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_delivery_queue_pending
        ON webhook_delivery_queue(created_at ASC)
        WHERE delivered_at IS NULL AND dlq_at IS NULL;
    `);

    // webhook_dlq_alerts — used by webhook/webhook-queue.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_dlq_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID REFERENCES webhooks(id) ON DELETE SET NULL,
        job_id VARCHAR(100),
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // performance_metrics — used by monitoring/index.ts recordMetric()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        value NUMERIC NOT NULL,
        unit VARCHAR(50),
        labels JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_name
        ON performance_metrics(name, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_time
        ON performance_metrics(timestamp DESC);
    `);

    // notification_logs — used by notifications/index.ts logNotification()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient VARCHAR(255),
        type VARCHAR(100),
        title VARCHAR(255),
        status VARCHAR(50),
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_created
        ON notification_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient
        ON notification_logs(recipient, created_at DESC);
    `);

    // notification_drafts — used by api/notifications/draft.ts (also self-creates as fallback)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        url VARCHAR(500),
        target VARCHAR(50) DEFAULT 'all',
        segment VARCHAR(100),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // comments — lib/comments/index.ts uses different column names than migration 001/029
    // migration 001 created: user_id, review_id, content
    // migration 029 added: target_type, target_id, parent_comment_id, helpful_count, unhelpful_count, deleted_at
    // lib/comments/index.ts expects: entity_type, entity_id, parent_id, user_name, user_avatar, depth, status
    await pool.query(`
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_avatar TEXT;
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS entity_id UUID;
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_entity
        ON comments(entity_type, entity_id, created_at DESC) WHERE status = 'active';
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id
        ON comments(parent_id, created_at ASC);
    `);

    // user_activity — recommendation/recommendations.ts uses entity_type, entity_id, action
    // migration 026 created: action_type, reference_type, reference_id
    await pool.query(`
      ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
      ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS entity_id TEXT;
      ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS action VARCHAR(100);
    `);

    // places — trending_score used in scheduler UPDATE but never added to places table
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS trending_score NUMERIC DEFAULT 0;
    `);

    // reviews — is_hidden used in review-moderation.ts but not in any migration
    await pool.query(`
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
    `);

    // webhooks — last_triggered used in webhooks/index.ts UPDATE but not in any migration
    await pool.query(`
      ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS last_triggered TIMESTAMP;
    `);

    // collections — tags and cover_image (alias for cover_image_url) not in migration 052
    await pool.query(`
      ALTER TABLE collections ADD COLUMN IF NOT EXISTS tags TEXT[];
      ALTER TABLE collections ADD COLUMN IF NOT EXISTS cover_image TEXT;
    `);

    // review_responses — vendor/vendor.ts uses vendor_id and response; migration 069 uses owner_id and response_text
    await pool.query(`
      ALTER TABLE review_responses ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE review_responses ADD COLUMN IF NOT EXISTS response TEXT;
    `);

    // place_views — analytics.ts inserts source column (not in migration 005)
    await pool.query(`
      ALTER TABLE place_views ADD COLUMN IF NOT EXISTS source VARCHAR(100);
    `);

    // webhook_deliveries — webhooks/index.ts uses event, response_status, retry_count, error (migration 004: event_type, status_code, attempts, error_message)
    await pool.query(`
      ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS event VARCHAR(100);
      ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_status INTEGER;
      ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
      ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS error TEXT;
    `);

    // newsletter_subscribers — newsletter/index.ts inserts name, preferences, subscribed_at (not in migration 025)
    await pool.query(`
      ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
      ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMP DEFAULT NOW();
    `);

    // collection_places — collections/index.ts inserts place_name, place_image, note (not in migration 052)
    await pool.query(`
      ALTER TABLE collection_places ADD COLUMN IF NOT EXISTS place_name VARCHAR(255);
      ALTER TABLE collection_places ADD COLUMN IF NOT EXISTS place_image TEXT;
      ALTER TABLE collection_places ADD COLUMN IF NOT EXISTS note TEXT;
    `);

    // moderation_actions — moderation/index.ts uses moderator_id instead of created_by
    // admin-moderation.ts inserts action_reason, action_details, duration_hours, is_permanent
    // migration 082 CREATE TABLE has these but it's a no-op (031 created it first)
    // migration 082 ALTER TABLE only adds admin_id, target_type, target_id, status, expires_at
    await pool.query(`
      ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS moderator_id UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS action_reason TEXT;
      ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS action_details JSONB;
      ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS duration_hours INTEGER;
      ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT false;
    `);

    // page_views — migration 005 created with page_path; analytics.ts inserts page_url, page_title, referrer_url, etc.
    await pool.query(`
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS page_url VARCHAR(500);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS page_title TEXT;
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS referrer_url VARCHAR(500);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS time_on_page_seconds INTEGER;
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS scroll_depth INTEGER;
    `);

    // blog_categories — migration 020 created; migration 120 no-op; color/parent_id/sort_order missing
    await pool.query(`
      ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS color VARCHAR(20);
      ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL;
      ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    `);

    // blog_tags — migration 020 created without description/color
    await pool.query(`
      ALTER TABLE blog_tags ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE blog_tags ADD COLUMN IF NOT EXISTS color VARCHAR(20);
    `);

    // blog_post_revisions — blog.ts inserts excerpt which is missing in migration 024
    await pool.query(`
      ALTER TABLE blog_post_revisions ADD COLUMN IF NOT EXISTS excerpt TEXT;
    `);

    // user_activities — activity/index.ts uses type, entity_type, entity_id, ip_address, user_agent
    // migration 120 created: activity_type, object_type, object_id (different naming)
    await pool.query(`
      ALTER TABLE user_activities ADD COLUMN IF NOT EXISTS type VARCHAR(100);
      ALTER TABLE user_activities ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
      ALTER TABLE user_activities ADD COLUMN IF NOT EXISTS entity_id UUID;
      ALTER TABLE user_activities ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
      ALTER TABLE user_activities ADD COLUMN IF NOT EXISTS user_agent TEXT;
    `);

    // users — push/index.ts reads/writes push_enabled and push_preferences on users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS push_preferences JSONB DEFAULT '{}';
    `);

    // place_photos — migration 012 created with user_id/url; code uses uploaded_by/file_path + extra columns
    await pool.query(`
      ALTER TABLE place_photos ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE place_photos ADD COLUMN IF NOT EXISTS file_path TEXT;
      ALTER TABLE place_photos ADD COLUMN IF NOT EXISTS file_size INTEGER;
      ALTER TABLE place_photos ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
      ALTER TABLE place_photos ADD COLUMN IF NOT EXISTS alt_text TEXT;
      ALTER TABLE place_photos ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
    `);

    // promotions — migration 049 created table; migration 129 no-op; missing columns from newer schema
    await pool.query(`
      ALTER TABLE promotions ADD COLUMN IF NOT EXISTS promotion_type VARCHAR(50);
      ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_percent INTEGER;
      ALTER TABLE promotions ADD COLUMN IF NOT EXISTS min_purchase_amount NUMERIC(10,2);
      ALTER TABLE promotions ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50);
      ALTER TABLE promotions ADD COLUMN IF NOT EXISTS usage_limit INTEGER;
      ALTER TABLE promotions ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
      ALTER TABLE promotions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    `);

    // webhooks — two different insert patterns; event (singular) and status columns missing
    await pool.query(`
      ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS event VARCHAR(100);
      ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
      ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    `);

    // reservations — migration 128 CREATE TABLE was no-op (024 created it first); missing columns not added via ALTER TABLE
    await pool.query(`
      ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
      ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
      ALTER TABLE reservations ADD COLUMN IF NOT EXISTS special_requests TEXT;
      ALTER TABLE reservations ADD COLUMN IF NOT EXISTS occasion VARCHAR(50);
    `);

    // audit_logs — lib/audit/index.ts uses different column names than migration 002 schema
    // migration 002: resource_type, resource_id, old_values, new_values
    // lib/audit/index.ts: entity_type, entity_id, old_value, new_value, user_name, metadata, severity
    await pool.query(`
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(50);
    `);

    // notifications — migration 009 created with 'read' and 'action_url'
    // lib/features/notifications.ts uses 'is_read' and 'link'
    await pool.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500);
    `);

    // chat_participants — migration 166 created without is_online / last_seen_at
    // lib/websocket/chat.ts queries and updates these columns
    await pool.query(`
      ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
      ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;
    `);

    // blog_posts — migration 134 adds cover_image and category, but 'tags TEXT[]' is never added
    await pool.query(`
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    `);

    // search_history — migration 003 created with 'query' column; 087 adds search_query via ALTER TABLE
    // but does NOT add search_type, result_count, filters — only search_query, user_id, created_at
    await pool.query(`
      ALTER TABLE search_history ADD COLUMN IF NOT EXISTS search_type VARCHAR(50) DEFAULT 'places';
      ALTER TABLE search_history ADD COLUMN IF NOT EXISTS result_count INTEGER DEFAULT 0;
      ALTER TABLE search_history ADD COLUMN IF NOT EXISTS filters JSONB;
    `);

    // user_loyalty — no CREATE TABLE in any migration; loyalty-points.ts insert/selects it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_loyalty (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        current_balance INTEGER NOT NULL DEFAULT 0,
        lifetime_earned INTEGER NOT NULL DEFAULT 0,
        lifetime_spent INTEGER NOT NULL DEFAULT 0,
        current_tier VARCHAR(50) DEFAULT 'bronze',
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_loyalty_user ON user_loyalty(user_id);
    `);

    // loyalty_transactions — migration 065 created with 'amount' and 'reason'
    // loyalty-points.ts uses 'points_amount' and 'transaction_reason'
    // migration 093 CREATE TABLE is no-op; its ALTER TABLE only adds other columns
    await pool.query(`
      ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS points_amount INTEGER;
      ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS transaction_reason TEXT;
    `);

    // places.featured — admin/places.ts uses SET featured = true; migration only has is_featured
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
    `);

    // comments.is_edited — comments/index.ts updates is_edited but no migration adds this column
    await pool.query(`
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
    `);

    // reviews.is_edited — reviews/enhanced.ts updateReview includes is_edited in update payload
    await pool.query(`
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
    `);

    // review_responses — migration 011 created with 'vendor_id'+'response'; migration 069's
    // ALTER TABLE adds place_id and owner_id but NOT response_text or is_public
    // review-management.ts inserts: review_id, place_id, owner_id, response_text, is_public
    await pool.query(`
      ALTER TABLE review_responses ADD COLUMN IF NOT EXISTS response_text TEXT;
      ALTER TABLE review_responses ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
    `);

    // user_follows — migration 011 created with 'follower_id'+'following_id'
    // migration 119 ALTER TABLE adds follower_user_id, following_user_id, followed_at — but NOT is_approved
    // social-features.ts inserts: follower_user_id, following_user_id, is_approved, followed_at
    await pool.query(`
      ALTER TABLE user_follows ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
    `);

    // push_subscriptions — migration 008 created with 'p256dh' and 'auth'; code uses 'p256dh_key' and 'auth_key'
    // also missing device_type, device_name, browser, os columns used in push-notifications.ts
    await pool.query(`
      ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS auth_key VARCHAR(255);
      ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS p256dh_key VARCHAR(255);
      ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
      ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
      ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS browser VARCHAR(100);
      ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS os VARCHAR(100);
    `);

    // client_errors — no CREATE TABLE in any migration; api/errors/client.ts uses .catch(() => null) so non-fatal
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_errors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message VARCHAR(500),
        stack TEXT,
        page_url VARCHAR(500),
        line_number INTEGER,
        column_number INTEGER,
        user_agent VARCHAR(255),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_address INET,
        context JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // featured_listings — migration 063 created without 'settings JSONB'; featured-listings.ts inserts it
    await pool.query(`
      ALTER TABLE featured_listings ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
    `);

    // email_sent_logs — migration 054 created without 'metadata'; subscription-email-notifications.ts inserts it
    await pool.query(`
      ALTER TABLE email_sent_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
    `);

    // promotions — migration 049 created with NOT NULL title, start_date, end_date, created_by
    // promotions/create.ts insert omits all of them and uses 'expires_at' instead of 'end_date'
    await pool.query(`
      ALTER TABLE promotions ALTER COLUMN title DROP NOT NULL;
      ALTER TABLE promotions ALTER COLUMN title SET DEFAULT '';
      ALTER TABLE promotions ALTER COLUMN start_date DROP NOT NULL;
      ALTER TABLE promotions ALTER COLUMN end_date DROP NOT NULL;
      ALTER TABLE promotions ALTER COLUMN created_by DROP NOT NULL;
      ALTER TABLE promotions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
    `);

    // webhooks — migration 004 created with 'name VARCHAR(255) NOT NULL' and 'events TEXT[]'
    // migration 059 ALTER TABLE adds 'event' (singular) but name remains NOT NULL with no default
    // webhooks.ts inserts without name — alter to add default
    await pool.query(`
      ALTER TABLE webhooks ALTER COLUMN name DROP NOT NULL;
      ALTER TABLE webhooks ALTER COLUMN name SET DEFAULT '';
    `);

    // webhook_events — migration 004 created as event-type catalog (event_name, description, example_payload)
    // migration 059 CREATE TABLE is no-op; its ALTER TABLE only adds status, created_at
    // webhooks.ts inserts: webhook_id, event, data, status, attempts — all missing from 004 schema
    await pool.query(`
      ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE;
      ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event VARCHAR(100);
      ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS data JSONB;
      ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
      ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;
    `);

    // user_sessions — migration 078 created base schema; migration 110 ALTER adds session_token, expires_at, invalidated_at
    // security.ts also inserts device_name, location, is_mobile, is_trusted — not added by any migration
    await pool.query(`
      ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
      ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS location VARCHAR(255);
      ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false;
      ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT false;
    `);

    // trusted_devices — migration 056 created with device_fingerprint, user_agent, expires_at
    // migration 110 ALTER adds is_active; security.ts also inserts device_id, device_name, ip_address, last_used_at
    await pool.query(`
      ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);
      ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
      ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS ip_address INET;
      ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;
    `);

    // saved_searches — migration 010 created with 'name'+'query'; code uses 'search_name'+'search_query'+'search_type'
    // migrations 052 and 087 CREATE TABLE are no-ops; 087 ALTER TABLE only adds user_id, created_at, is_favorite
    await pool.query(`
      ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS search_name VARCHAR(255);
      ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS search_query VARCHAR(255);
      ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS search_type VARCHAR(50) DEFAULT 'places';
    `);

    // email_campaigns — migration 018 created with 'subject' not 'subject_line', no campaign_type, open/click/bounce counts
    // migration 073 ALTER TABLE only adds user_id, status, created_at
    await pool.query(`
      ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50);
      ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS subject_line TEXT;
      ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS plain_text_content TEXT;
      ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;
      ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
      ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS bounce_count INTEGER DEFAULT 0;
      ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS unsubscribe_count INTEGER DEFAULT 0;
      ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS spent_cents INTEGER DEFAULT 0;
    `);

    // points_transactions — migration 022 created with 'description' but no 'reason'
    // api/points/add.ts and api/reviews/post.ts insert with 'reason' column
    await pool.query(`
      ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS reason TEXT;
    `);

    // notification_broadcasts — no CREATE TABLE in any migration
    // api/notifications/send.ts inserts: id, title, message, url, target, recipient_count, sent_by
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_broadcasts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        url VARCHAR(500),
        target VARCHAR(50) DEFAULT 'all',
        recipient_count INTEGER DEFAULT 0,
        sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // vendor_profiles — migration 011 created with phone/email/verified; code uses business_phone/business_email/is_verified + many missing columns
    await pool.query(`
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS business_email VARCHAR(255);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS business_website VARCHAR(500);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS district VARCHAR(100);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS business_category VARCHAR(100);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS logo VARCHAR(500);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS banner VARCHAR(500);
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // page_views — migration 005 created with page_path/referrer/duration_ms; analytics.ts uses page_url/page_title/referrer_url/scroll_depth
    await pool.query(`
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS page_url VARCHAR(500);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS page_title VARCHAR(500);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS referrer_url VARCHAR(500);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS time_on_page_seconds INTEGER;
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS scroll_depth INTEGER;
    `);

    // comments — migration 001 created with review_id NOT NULL; comment/comments.ts uses target_type/target_id/parent_comment_id
    await pool.query(`
      ALTER TABLE comments ALTER COLUMN review_id DROP NOT NULL;
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS target_id UUID;
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
    `);

    // user_badges — migration 011 created with badge_type NOT NULL; badges.ts inserts badge_id/unlock_reason instead
    await pool.query(`
      ALTER TABLE user_badges ALTER COLUMN badge_type DROP NOT NULL;
      ALTER TABLE user_badges ALTER COLUMN badge_type SET DEFAULT '';
      ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS badge_id UUID;
      ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS unlock_reason TEXT;
      ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
    `);

    // blog_posts — migration 001 created with minimal schema; blog.ts inserts many more columns
    await pool.query(`
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS excerpt TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category_id UUID;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS featured_image VARCHAR(500);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS read_time_minutes INTEGER;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_title VARCHAR(500);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_description TEXT;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
    `);

    // events — migration 001 created for city events (title/slug/description NOT NULL);
    // event-store.ts also uses this table for event-sourcing (aggregate_id/type/payload/version)
    await pool.query(`
      ALTER TABLE events ALTER COLUMN title DROP NOT NULL;
      ALTER TABLE events ALTER COLUMN title SET DEFAULT '';
      ALTER TABLE events ALTER COLUMN slug DROP NOT NULL;
      ALTER TABLE events ALTER COLUMN slug SET DEFAULT '';
      ALTER TABLE events ALTER COLUMN description DROP NOT NULL;
      ALTER TABLE events ALTER COLUMN description SET DEFAULT '';
      ALTER TABLE events ALTER COLUMN start_date DROP NOT NULL;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS aggregate_id UUID;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS aggregate_type VARCHAR(100);
      ALTER TABLE events ADD COLUMN IF NOT EXISTS type VARCHAR(100);
      ALTER TABLE events ADD COLUMN IF NOT EXISTS payload JSONB;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS version INTEGER;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP;
    `);

    // billing_history — migration 051 created without billing_cycle; stripe webhook + subscription-management insert it
    await pool.query(`
      ALTER TABLE billing_history ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50);
    `);

    // reviews — migration 001 created without is_approved; reviews/post.ts inserts is_approved: true
    await pool.query(`
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
    `);

    // file_access_logs — migration 102 uses accessed_by_user_id/created_at; file-management.ts uses user_id/accessed_at
    await pool.query(`
      ALTER TABLE file_access_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE file_access_logs ADD COLUMN IF NOT EXISTS accessed_at TIMESTAMP DEFAULT NOW();
    `);

    // places — no migration adds amenities; places/[id]/update.ts sets amenities TEXT[]
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS amenities TEXT[];
    `);

    // notification_preferences — migration 075 uses specific boolean columns;
    // notifications/index.ts inserts channel/enabled/frequency (generic channel-based schema)
    await pool.query(`
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS channel VARCHAR(50);
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT 'immediate';
    `);

    // user_activity — migration 026 uses action_type/reference_type/reference_id;
    // recommendation/recommendations.ts inserts entity_type/entity_id/action (different naming)
    await pool.query(`
      ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
      ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS entity_id TEXT;
      ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS action VARCHAR(100);
    `);

    // vendor_profiles — vendor-onboarding.ts update() sets rejection_reason (not yet added)
    await pool.query(`
      ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    // push_subscriptions — migration 084 ALTER TABLE adds is_active/last_verified_at but NOT updated_at
    // postgres.ts update() always appends "updated_at = NOW()" — tables without it will fail on update()
    // Add updated_at to all tables that receive update() calls but lack it in their first migration
    await pool.query(`
      ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE search_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE two_fa_recovery_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE two_fa_verification_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE user_2fa_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE share_analytics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE tenant_api_keys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE email_sequence_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE funnel_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE journey_paths ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE user_journey_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE collaboration_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE collaboration_participants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE user_recommendations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE ddos_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // historical_sites — migration 024 created without is_featured; admin sets it via update()
    await pool.query(`
      ALTER TABLE historical_sites ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP TABLE IF EXISTS social_shares CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS analytics_events_realtime CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS messages CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS conversation_participants CASCADE`);
  },
};
