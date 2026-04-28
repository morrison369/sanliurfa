-- Collections and Bookmarks
-- Created: 2026-04-13

CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  cover_image TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_collections_user ON collections(user_id);
CREATE INDEX idx_collections_public ON collections(is_public) WHERE is_public = true;

-- Collection places
CREATE TABLE IF NOT EXISTS collection_places (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  place_id VARCHAR(50) NOT NULL,
  place_name VARCHAR(200) NOT NULL,
  place_image TEXT,
  note TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, place_id)
);

CREATE INDEX idx_collection_places_collection ON collection_places(collection_id);
CREATE INDEX idx_collection_places_place ON collection_places(place_id);

-- Collection followers
CREATE TABLE IF NOT EXISTS collection_followers (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

CREATE INDEX idx_collection_followers_collection ON collection_followers(collection_id);
CREATE INDEX idx_collection_followers_user ON collection_followers(user_id);

-- Share counts for caching
CREATE TABLE IF NOT EXISTS share_counts (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL,
  content_id VARCHAR(50) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_type, content_id, platform)
);

CREATE INDEX idx_share_counts_content ON share_counts(content_type, content_id);
