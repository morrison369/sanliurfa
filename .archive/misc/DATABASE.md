# Şanlıurfa.com Database Schema

## Overview

- **Database:** PostgreSQL 15+
- **Migrations:** 127 migration files
- **Connection Pooling:** 5-20 connections (adaptive)
- **Read Replica:** Optional support

---

## Core Tables

### users
```sql
- id: uuid PRIMARY KEY
- email: varchar(255) UNIQUE NOT NULL
- password_hash: varchar(255) NOT NULL
- full_name: varchar(255)
- avatar_url: text
- role: enum('user', 'moderator', 'admin', 'super_admin') DEFAULT 'user'
- status: enum('active', 'inactive', 'suspended', 'deleted') DEFAULT 'active'
- email_verified: boolean DEFAULT false
- created_at: timestamp
- updated_at: timestamp
- last_login_at: timestamp
- preferences: jsonb
```

### places
```sql
- id: uuid PRIMARY KEY
- slug: varchar(255) UNIQUE NOT NULL
- name: varchar(255) NOT NULL
- description: text
- category: varchar(100) NOT NULL
- address: text
- latitude: decimal(10,8)
- longitude: decimal(11,8)
- phone: varchar(50)
- website: varchar(255)
- images: text[]
- rating: decimal(2,1) DEFAULT 0
- review_count: integer DEFAULT 0
- status: enum('active', 'pending', 'rejected', 'inactive') DEFAULT 'pending'
- created_by: uuid REFERENCES users(id)
- verified_at: timestamp
- created_at: timestamp
- updated_at: timestamp
- metadata: jsonb
```

### reviews
```sql
- id: uuid PRIMARY KEY
- place_id: uuid REFERENCES places(id) ON DELETE CASCADE
- user_id: uuid REFERENCES users(id) ON DELETE CASCADE
- rating: integer NOT NULL CHECK (rating >= 1 AND rating <= 5)
- content: text NOT NULL
- images: text[]
- helpful_count: integer DEFAULT 0
- status: enum('active', 'pending', 'rejected') DEFAULT 'pending'
- created_at: timestamp
- updated_at: timestamp
```

### favorites
```sql
- id: uuid PRIMARY KEY
- user_id: uuid REFERENCES users(id) ON DELETE CASCADE
- place_id: uuid REFERENCES places(id) ON DELETE CASCADE
- created_at: timestamp
- UNIQUE(user_id, place_id)
```

### blog_posts
```sql
- id: uuid PRIMARY KEY
- slug: varchar(255) UNIQUE NOT NULL
- title: varchar(255) NOT NULL
- content: text NOT NULL
- excerpt: text
- author_id: uuid REFERENCES users(id)
- category: varchar(100)
- tags: text[]
- featured_image: text
- status: enum('draft', 'published', 'archived') DEFAULT 'draft'
- published_at: timestamp
- created_at: timestamp
- updated_at: timestamp
- view_count: integer DEFAULT 0
```

---

## Supporting Tables

### notifications
```sql
- id: uuid PRIMARY KEY
- user_id: uuid REFERENCES users(id) ON DELETE CASCADE
- type: varchar(50) NOT NULL
- title: varchar(255)
- message: text
- data: jsonb
- read_at: timestamp
- created_at: timestamp
```

### messages / conversations
```sql
- id: uuid PRIMARY KEY
- participant_ids: uuid[] NOT NULL
- created_at: timestamp
- updated_at: timestamp
```

### message_entries
```sql
- id: uuid PRIMARY KEY
- conversation_id: uuid REFERENCES conversations(id) ON DELETE CASCADE
- sender_id: uuid REFERENCES users(id)
- content: text
- created_at: timestamp
- read_by: uuid[]
```

### events
```sql
- id: uuid PRIMARY KEY
- slug: varchar(255) UNIQUE
- title: varchar(255) NOT NULL
- description: text
- location: text
- latitude: decimal(10,8)
- longitude: decimal(11,8)
- start_date: timestamp
- end_date: timestamp
- organizer_id: uuid REFERENCES users(id)
- max_attendees: integer
- status: enum('draft', 'published', 'cancelled', 'completed')
- created_at: timestamp
```

### event_attendees
```sql
- id: uuid PRIMARY KEY
- event_id: uuid REFERENCES events(id) ON DELETE CASCADE
- user_id: uuid REFERENCES users(id) ON DELETE CASCADE
- status: enum('going', 'maybe', 'declined')
- created_at: timestamp
- UNIQUE(event_id, user_id)
```

### subscriptions
```sql
- id: uuid PRIMARY KEY
- user_id: uuid REFERENCES users(id) ON DELETE CASCADE
- tier: enum('free', 'basic', 'premium', 'enterprise')
- status: enum('active', 'cancelled', 'expired')
- started_at: timestamp
- expires_at: timestamp
- payment_provider: varchar(50)
- payment_subscription_id: varchar(255)
```

### loyalty_points
```sql
- id: uuid PRIMARY KEY
- user_id: uuid REFERENCES users(id) ON DELETE CASCADE
- points: integer NOT NULL
- action_type: varchar(100)
- reference_id: uuid
- description: text
- created_at: timestamp
```

### badges
```sql
- id: uuid PRIMARY KEY
- key: varchar(100) UNIQUE NOT NULL
- name: varchar(255) NOT NULL
- description: text
- icon: varchar(255)
- criteria: jsonb
- created_at: timestamp
```

### user_badges
```sql
- id: uuid PRIMARY KEY
- user_id: uuid REFERENCES users(id) ON DELETE CASCADE
- badge_id: uuid REFERENCES badges(id) ON DELETE CASCADE
- unlocked_at: timestamp
- UNIQUE(user_id, badge_id)
```

### webhooks
```sql
- id: uuid PRIMARY KEY
- user_id: uuid REFERENCES users(id) ON DELETE CASCADE
- url: text NOT NULL
- events: text[] NOT NULL
- secret: text
- status: enum('active', 'inactive')
- created_at: timestamp
```

---

## Indexes

### Performance Indexes
```sql
-- Places
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_status ON places(status);
CREATE INDEX idx_places_location ON places USING GIST (point(longitude, latitude));
CREATE INDEX idx_places_rating ON places(rating DESC);

-- Reviews
CREATE INDEX idx_reviews_place_id ON reviews(place_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status);

-- Search
CREATE INDEX idx_places_search ON places USING gin(to_tsvector('turkish', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_blog_posts_search ON blog_posts USING gin(to_tsvector('turkish', title || ' ' || COALESCE(content, '')));

-- Notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at) WHERE read_at IS NULL;
```

---

## Maintenance

### Backup Script
```bash
# Daily backup
docker exec sanliurfa_postgres pg_dump -U postgres sanliurfa > backup-$(date +%Y%m%d).sql

# With compression
docker exec sanliurfa_postgres pg_dump -U postgres sanliurfa | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Vacuum & Analyze
```sql
-- Weekly maintenance
VACUUM ANALYZE;
REINDEX DATABASE sanliurfa;
```

### Connection Monitoring
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

---

## Migration History

Total: **127 migrations** (001 - 127)

Key migrations:
- `001_initial_schema.ts` - Core tables
- `003_fulltext_search.ts` - Search indexes
- `005_analytics.ts` - Analytics tables
- `019_database_optimization.ts` - Performance indexes
- `020_blog_system.ts` - Blog feature
- `036_performance_indexes.ts` - Additional indexes

---

*Last updated: 2026-04-11*
