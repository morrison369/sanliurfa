/**
 * Migrasyon 020: Blog Sistemi
 * Blog yazıları, kategoriler, yorum ve etiketler için tablolar
 */

export const migration_020_blog_system = {
  name: '020_blog_system',
  async up(pool: any) {
    // Blog kategorileri
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Blog yazıları
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        content TEXT NOT NULL,
        excerpt TEXT,
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        category_id INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL,
        featured_image VARCHAR(500),
        thumbnail VARCHAR(500),
        status VARCHAR(50) DEFAULT 'draft',
        is_featured BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        read_time_minutes INTEGER,
        seo_title VARCHAR(255),
        seo_description VARCHAR(500),
        seo_keywords VARCHAR(255),
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Blog yazı etiketleri
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        slug VARCHAR(50) NOT NULL UNIQUE,
        post_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Blog yazı-etiket ilişkisi
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_post_tags (
        post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES blog_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
      )
    `);

    // Blog yazı yorumları
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100),
        author_email VARCHAR(100),
        content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        parent_comment_id INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
        like_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Blog abonelikleri (newsletter)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_subscriptions (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'subscribed',
        categories TEXT,
        unsubscribed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Blog okuma geçmişi (user engagement tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_reading_history (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
        time_spent_seconds INTEGER,
        scroll_percentage INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `);

    // İndeksler - arama ve filtreleme
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug
      ON blog_posts(slug)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id
      ON blog_posts(author_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id
      ON blog_posts(category_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published
      ON blog_posts(status, published_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured
      ON blog_posts(is_featured, published_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at
      ON blog_posts(created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id
      ON blog_comments(post_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id
      ON blog_comments(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_comments_status
      ON blog_comments(status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_tags_slug
      ON blog_tags(slug)
    `);

    // Full-text search indexing
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_search
      ON blog_posts USING GIN(to_tsvector('turkish', title || ' ' || excerpt || ' ' || content))
    `);

    // Varsayılan kategorileri ekle
    await pool.query(`
      INSERT INTO blog_categories (name, slug, description, order_index)
      VALUES
        ('Seyahat', 'seyahat', 'Şanlıurfa seyahat rehberi ve ipuçları', 1),
        ('Kültür & Tarih', 'kultur-tarih', 'Şanlıurfa''nın zengin tarih ve kültürü', 2),
        ('Yerel Mutfak', 'yerel-mutfak', 'Urfa yemekleri ve tarif rehberi', 3),
        ('Etkinlikler', 'etkinlikler', 'Şanlıurfa''da yapılacak etkinlikler', 4),
        ('Rehberler', 'rehberler', 'Kapsamlı seyahat rehberleri', 5)
      ON CONFLICT (slug) DO NOTHING
    `);

    console.log('✓ Migrasyon 020: Blog sistemi tabloları oluşturuldu');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS blog_reading_history CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_subscriptions CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_comments CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_post_tags CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_tags CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_posts CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_categories CASCADE');
    console.log('✓ Migrasyon 020 geri alındı');
  }
};
