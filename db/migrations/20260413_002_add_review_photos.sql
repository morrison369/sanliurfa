-- Review Photos and Helpful Votes
-- Created: 2026-04-13

-- Review photos
CREATE TABLE IF NOT EXISTS review_photos (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_review_photos_review ON review_photos(review_id);

-- Review helpful votes
CREATE TABLE IF NOT EXISTS review_helpful (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

CREATE INDEX idx_review_helpful_review ON review_helpful(review_id);
CREATE INDEX idx_review_helpful_user ON review_helpful(user_id);

-- Add columns to reviews table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'helpful_count') THEN
    ALTER TABLE reviews ADD COLUMN helpful_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'title') THEN
    ALTER TABLE reviews ADD COLUMN title VARCHAR(200);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'visit_date') THEN
    ALTER TABLE reviews ADD COLUMN visit_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'is_verified') THEN
    ALTER TABLE reviews ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'is_local_guide') THEN
    ALTER TABLE reviews ADD COLUMN is_local_guide BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'language') THEN
    ALTER TABLE reviews ADD COLUMN language VARCHAR(5) DEFAULT 'tr';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'edited_at') THEN
    ALTER TABLE reviews ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'status') THEN
    ALTER TABLE reviews ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;
