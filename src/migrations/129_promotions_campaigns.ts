import type { Migration } from '../lib/migrations/migration-system';

const migration: Migration = {
  version: 129,
  name: 'promotions_campaigns',
  description: 'Add promotions and campaigns system for places',
  
  up: async (client) => {
    // Promosyonlar tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        promotion_type VARCHAR(50) NOT NULL CHECK (
          promotion_type IN ('discount', 'free_item', 'bogo', 'percentage_off', 'fixed_amount', 'happy_hour', 'special_offer')
        ),
        discount_value DECIMAL(10,2),
        discount_percent INTEGER CHECK (discount_percent BETWEEN 0 AND 100),
        min_purchase_amount DECIMAL(10,2),
        max_discount_amount DECIMAL(10,2),
        promo_code VARCHAR(50),
        usage_limit INTEGER,
        usage_count INTEGER DEFAULT 0,
        
        -- Validity
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        
        -- Applicability
        days_of_week INTEGER[], -- [1,2,3,4,5] for weekdays
        applicable_items TEXT[], -- Specific menu items
        excluded_items TEXT[],
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),
        featured BOOLEAN DEFAULT false,
        
        -- Media
        image_url TEXT,
        
        -- Tracking
        views INTEGER DEFAULT 0,
        redemptions INTEGER DEFAULT 0,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id),
        
        CONSTRAINT valid_dates CHECK (end_date >= start_date)
      );
    `);

    // Kampanyalar tablosu (daha büyük ölçekli etkinlikler)
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        campaign_type VARCHAR(50) NOT NULL CHECK (
          campaign_type IN ('seasonal', 'holiday', 'event', 'loyalty', 'referral', 'grand_opening', 'anniversary')
        ),
        
        -- Timing
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        
        -- Content
        terms_conditions TEXT,
        how_to_redeem TEXT,
        
        -- Status
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
        
        -- Media
        banner_image TEXT,
        gallery_images TEXT[],
        
        -- Tracking
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        CONSTRAINT campaign_valid_dates CHECK (end_date >= start_date)
      );
    `);

    // Kullanıcı promosyon kullanımları
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_promotion_redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        guest_email VARCHAR(255),
        guest_phone VARCHAR(20),
        redemption_code VARCHAR(20) UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
        redeemed_at TIMESTAMPTZ,
        used_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'claimed' CHECK (status IN ('claimed', 'redeemed', 'expired', 'cancelled')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // İndeksler
    await client.query(`
      CREATE INDEX idx_promotions_place_id ON promotions(place_id);
      CREATE INDEX idx_promotions_status ON promotions(status);
      CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
      CREATE INDEX idx_promotions_featured ON promotions(featured) WHERE featured = true;
      CREATE INDEX idx_promotions_type ON promotions(promotion_type);
      
      CREATE INDEX idx_campaigns_place_id ON campaigns(place_id);
      CREATE INDEX idx_campaigns_status ON campaigns(status);
      CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
      
      CREATE INDEX idx_redemptions_promotion_id ON user_promotion_redemptions(promotion_id);
      CREATE INDEX idx_redemptions_user_id ON user_promotion_redemptions(user_id);
      CREATE INDEX idx_redemptions_code ON user_promotion_redemptions(redemption_code);
    `);

    // Aktif promosyonlar görünümü
    await client.query(`
      CREATE OR REPLACE VIEW active_promotions AS
      SELECT 
        p.*,
        pl.name as place_name,
        pl.slug as place_slug,
        pl.image_url as place_image
      FROM promotions p
      JOIN places pl ON p.place_id = pl.id
      WHERE p.status = 'active'
        AND p.start_date <= CURRENT_DATE
        AND p.end_date >= CURRENT_DATE
        AND (p.usage_limit IS NULL OR p.usage_count < p.usage_limit);
    `);

    // Promosyon istatistikleri fonksiyonu
    await client.query(`
      CREATE OR REPLACE FUNCTION get_promotion_stats(promotion_uuid UUID)
      RETURNS TABLE (
        total_claimed BIGINT,
        total_redeemed BIGINT,
        conversion_rate NUMERIC,
        remaining_uses INTEGER
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('claimed', 'redeemed')) as total_claimed,
          COUNT(*) FILTER (WHERE status = 'redeemed') as total_redeemed,
          CASE 
            WHEN COUNT(*) FILTER (WHERE status IN ('claimed', 'redeemed')) > 0 
            THEN ROUND(COUNT(*) FILTER (WHERE status = 'redeemed') * 100.0 / 
                 COUNT(*) FILTER (WHERE status IN ('claimed', 'redeemed')), 2)
            ELSE 0
          END as conversion_rate,
          p.usage_limit - p.usage_count as remaining_uses
        FROM user_promotion_redemptions r
        JOIN promotions p ON r.promotion_id = p.id
        WHERE r.promotion_id = promotion_uuid
        GROUP BY p.usage_limit, p.usage_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
  },

  down: async (client) => {
    await client.query(`DROP VIEW IF EXISTS active_promotions;`);
    await client.query(`DROP FUNCTION IF EXISTS get_promotion_stats;`);
    await client.query(`DROP TABLE IF EXISTS user_promotion_redemptions;`);
    await client.query(`DROP TABLE IF EXISTS campaigns;`);
    await client.query(`DROP TABLE IF EXISTS promotions;`);
  }
};

export default migration;
