-- Reservation System
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid REFERENCES places(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_type VARCHAR(50) NOT NULL, -- 'table', 'hotel_room', 'tour'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  
  -- Date & Time
  reservation_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  
  -- Guest Info
  guest_count INTEGER NOT NULL DEFAULT 1,
  guest_name VARCHAR(255),
  guest_phone VARCHAR(20),
  guest_email VARCHAR(255),
  special_requests TEXT,
  
  -- Hotel specific
  room_type VARCHAR(100),
  room_count INTEGER DEFAULT 1,
  
  -- Payment
  total_amount DECIMAL(10, 2),
  deposit_amount DECIMAL(10, 2),
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  
  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT
);

-- Coupon System
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Discount
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount'
  discount_value DECIMAL(10, 2) NOT NULL,
  max_discount_amount DECIMAL(10, 2), -- For percentage discounts
  
  -- Limits
  usage_limit INTEGER, -- NULL = unlimited
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  
  -- Validity
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  
  -- Applicability
  minimum_purchase DECIMAL(10, 2) DEFAULT 0,
  applicable_categories TEXT[], -- NULL = all
  applicable_places uuid[], -- NULL = all
  excluded_places uuid[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Coupon Usage
CREATE TABLE IF NOT EXISTS coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coupon_id, user_id, reservation_id)
);

-- Search Index for Full-Text Search
CREATE TABLE IF NOT EXISTS search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- 'place', 'blog_post', 'historical_site', 'event'
  content_id uuid NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  tags TEXT[],
  category VARCHAR(100),
  
  -- Search vector (for PostgreSQL full-text search)
  search_vector tsvector,
  
  -- Metadata
  image_url TEXT,
  slug TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(content_type, content_id)
);

-- Create search index
CREATE INDEX IF NOT EXISTS idx_search_vector ON search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_content_type ON search_index(content_type);
CREATE INDEX IF NOT EXISTS idx_search_status ON search_index(status);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('turkish', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('turkish', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('turkish', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search index
CREATE TRIGGER trigger_update_search_vector
  BEFORE INSERT OR UPDATE ON search_index
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();

-- Blog Post Sections (for TOC)
CREATE TABLE IF NOT EXISTS blog_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  level INTEGER DEFAULT 2, -- h2, h3, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Place Gallery Images
CREATE TABLE IF NOT EXISTS place_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid REFERENCES places(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  alt_text TEXT,
  order_index INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_gallery ENABLE ROW LEVEL SECURITY;

-- Reservations: Users can see their own, admins can see all
CREATE POLICY "Users can view own reservations" ON reservations
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can create reservations" ON reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending reservations" ON reservations
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Coupons: Public readable
CREATE POLICY "Coupons are publicly viewable" ON coupons
  FOR SELECT USING (is_active = true AND (end_date IS NULL OR end_date > now()));

-- Coupon usages: Users can see their own
CREATE POLICY "Users can view own coupon usages" ON coupon_usages
  FOR SELECT USING (auth.uid() = user_id);

-- Search index: Public readable
CREATE POLICY "Search index is publicly viewable" ON search_index
  FOR SELECT USING (status = 'active');

-- Blog sections: Public readable
CREATE POLICY "Blog sections are publicly viewable" ON blog_sections
  FOR SELECT USING (true);

-- Place gallery: Public readable
CREATE POLICY "Place gallery is publicly viewable" ON place_gallery
  FOR SELECT USING (true);

-- Insert sample coupons
INSERT INTO coupons (code, description, discount_type, discount_value, max_discount_amount, usage_limit, minimum_purchase, start_date, end_date) VALUES
('HOSEGELDIN20', 'Yeni üyelere özel %20 indirim', 'percentage', 20, 100, 1000, 50, NOW(), NOW() + INTERVAL '3 months'),
('URFA50', '50 TL indirim kuponu', 'fixed_amount', 50, NULL, 500, 100, NOW(), NOW() + INTERVAL '1 month'),
('GIDA15', 'Restoranlarda %15 indirim', 'percentage', 15, 50, NULL, 30, NOW(), NOW() + INTERVAL '2 months');

-- Function to increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coupons SET usage_count = usage_count + 1 WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_coupon_usage
  AFTER INSERT ON coupon_usages
  FOR EACH ROW
  EXECUTE FUNCTION increment_coupon_usage();
