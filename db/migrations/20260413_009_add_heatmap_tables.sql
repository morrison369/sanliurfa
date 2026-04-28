-- Heatmap Analytics Tables
-- Created: 2026-04-13

CREATE TABLE IF NOT EXISTS heatmap_events (
  id SERIAL PRIMARY KEY,
  page_url VARCHAR(500) NOT NULL,
  element_path VARCHAR(500),
  x INTEGER,
  y INTEGER,
  type VARCHAR(20) NOT NULL CHECK (type IN ('click', 'scroll', 'move', 'attention')),
  session_id VARCHAR(100) NOT NULL,
  viewport_width INTEGER,
  viewport_height INTEGER,
  device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_heatmap_page ON heatmap_events(page_url);
CREATE INDEX idx_heatmap_type ON heatmap_events(type);
CREATE INDEX idx_heatmap_created ON heatmap_events(created_at);
CREATE INDEX idx_heatmap_session ON heatmap_events(session_id);

-- CDN Assets table
CREATE TABLE IF NOT EXISTS cdn_assets (
  id SERIAL PRIMARY KEY,
  cdn_path VARCHAR(500) NOT NULL UNIQUE,
  original_path VARCHAR(500),
  content_type VARCHAR(100),
  size BIGINT,
  cache_duration INTEGER,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cdn_assets_path ON cdn_assets(cdn_path);
