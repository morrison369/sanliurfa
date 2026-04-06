-- Şanlıurfa.com Database Seed Data

-- Kategoriler
INSERT INTO categories (id, name, slug, type, description, icon, color, sort_order, is_active) VALUES
('restaurant', 'Restoran', 'restoran', 'place', 'Yerel ve uluslararası mutfaklar', 'utensils', '#EF4444', 1, true),
('cafe', 'Kafe', 'kafe', 'place', 'Kahve ve tatlı mekanları', 'coffee', '#F59E0B', 2, true),
('hotel', 'Otel', 'otel', 'place', 'Konaklama ve oteller', 'bed', '#3B82F6', 3, true),
('museum', 'Müze', 'muze', 'place', 'Tarihi ve kültürel müzeler', 'landmark', '#8B5CF6', 4, true),
('park', 'Park', 'park', 'place', 'Park ve mesire alanları', 'tree-pine', '#10B981', 5, true),
('shopping', 'Alışveriş', 'alisveris', 'place', 'Alışveriş merkezleri ve çarşılar', 'shopping-bag', '#EC4899', 6, true),
('entertainment', 'Eğlence', 'eglence', 'place', 'Eğlence ve aktivite mekanları', 'party-popper', '#F97316', 7, true),
('other', 'Diğer', 'diger', 'place', 'Diğer mekanlar', 'more-horizontal', '#6B7280', 8, true)
ON CONFLICT (id) DO NOTHING;

-- Blog Kategorileri
INSERT INTO categories (id, name, slug, type, description, icon, color, sort_order, is_active) VALUES
('genel', 'Genel', 'genel', 'blog', 'Genel konular', 'file-text', '#6B7280', 1, true),
('kultur-sanat', 'Kültür & Sanat', 'kultur-sanat', 'blog', 'Kültürel ve sanatsal içerikler', 'palette', '#8B5CF6', 2, true),
('gastronomi', 'Gastronomi', 'gastronomi', 'blog', 'Yemek ve lezzet kültürü', 'utensils', '#F59E0B', 3, true),
('tarih', 'Tarih', 'tarih', 'blog', 'Tarihi yazılar ve araştırmalar', 'scroll', '#78350F', 4, true),
('gezi-rehberi', 'Gezi Rehberi', 'gezi-rehberi', 'blog', 'Gezi ve seyahat rehberleri', 'map', '#10B981', 5, true),
('etkinlik', 'Etkinlik', 'etkinlik', 'blog', 'Etkinlik duyuruları', 'calendar', '#3B82F6', 6, true),
('haber', 'Haber', 'haber', 'blog', 'Şanlıurfa haberleri', 'newspaper', '#EF4444', 7, true)
ON CONFLICT (id) DO NOTHING;

-- Admin kullanıcısı
INSERT INTO users (id, email, password_hash, full_name, role, email_verified, created_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@sanliurfa.com',
    'c75c1c5d23c4a30c22b8909b2947733cc538ff62e0da4b27d8589b93c1332866',
    'Admin User',
    'admin',
    true,
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Örnek mekanlar
INSERT INTO places (id, slug, name, description, short_description, address, category, status, rating, is_featured, images, created_at)
VALUES 
(
    gen_random_uuid(),
    'balikli-gol',
    'Balıklıgöl',
    'Hz. İbrahim''in ateşe atıldığında düştüğü yer olarak bilinen kutsal göl. İçinde yaşayan kutsal balıklarla ünlüdür.',
    'Kutsal balıkların yüzdüğü tarihi göl',
    'Balıklıgöl, Halilürrahman, Şanlıurfa',
    'other',
    'active',
    4.9,
    true,
    ARRAY['https://images.unsplash.com/photo-1594828378314-a1e84f9a229e'],
    NOW()
),
(
    gen_random_uuid(),
    'gobeklitepe',
    'Göbeklitepe',
    'Dünyanın bilinen en eski tapınak kompleksi. UNESCO Dünya Mirası Listesi''nde yer alır. 12.000 yıllık tarihiyle insanlık tarihini yeniden yazmıştır.',
    '12.000 yıllık dünyanın ilk tapınağı',
    'Örencik Köyü, Haliliye, Şanlıurfa',
    'museum',
    'active',
    5.0,
    true,
    ARRAY['https://images.unsplash.com/photo-1564507592333-c60657eea523'],
    NOW()
),
(
    gen_random_uuid(),
    'urfa-kebap-evi',
    'Urfa Kebap Evi',
    'Geleneksel Şanlıurfa kebaplarının en lezzetli halini sunan restoran. Ciğer kebabı ve patlıcan kebabı mutlaka denenmeli.',
    'Otantik Urfa kebapları',
    'Atatürk Bulvarı No:45, Şanlıurfa',
    'restaurant',
    'active',
    4.7,
    false,
    ARRAY['https://images.unsplash.com/photo-1555939594-58d7cb561ad1'],
    NOW()
)
ON CONFLICT DO NOTHING;

-- Örnek blog yazıları
INSERT INTO blog_posts (id, slug, title, excerpt, content, category, is_published, published_at, created_at)
VALUES
(
    gen_random_uuid(),
    'sanliurfa-gezi-rehberi',
    'Şanlıurfa Gezi Rehberi: 3 Günlük Program',
    'Şanlıurfa''yı keşfetmek için hazırladığımız kapsamlı gezi rehberi. Göbeklitepe, Balıklıgöl ve daha fazlası...',
    '<h2>1. Gün: Tarihin Sıfır Noktası</h2><p>Şanlıurfa gezinize Göbeklitepe ile başlayın...</p>',
    'gezi-rehberi',
    true,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'urfa-mutfagi-lezzetleri',
    'Şanlıurfa Mutfağının Eşsiz Lezzetleri',
    'Ciğer kebabından çiğ köfteye, bici bici kadayıftan şıllık tatlısına Şanlıurfa mutfağının eşsiz tatları...',
    '<h2>Urfa Kebabı</h2><p>Şanlıurfa''nın en meşhur lezzeti...</p>',
    'gastronomi',
    true,
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;

-- Örnek etkinlikler
INSERT INTO events (id, slug, title, description, location, start_date, category, is_featured, created_at)
VALUES
(
    gen_random_uuid(),
    'gobeklitepe-muzik-festivali',
    'Göbeklitepe Müzik Festivali',
    'Tarihin sıfır noktasında unutulmaz bir müzik deneyimi. Yerli ve yabancı sanatçıların katılacağı festival.',
    'Göbeklitepe, Şanlıurfa',
    '2026-06-21',
    'muzik',
    true,
    NOW()
),
(
    gen_random_uuid(),
    'urfa-sokak-lezzetleri-festivali',
    'Urfa Sokak Lezzetleri Festivali',
    'Şanlıurfa''nın eşsiz sokak lezzetlerini keşfetmek için düzenlenen festival.',
    'Balıklıgöl çevresi, Şanlıurfa',
    '2026-05-15',
    'gastronomi',
    true,
    NOW()
)
ON CONFLICT DO NOTHING;

-- Örnek tarihi yerler
INSERT INTO historical_sites (id, slug, name, description, short_description, location, period, is_unesco, is_featured, created_at)
VALUES
(
    gen_random_uuid(),
    'haleplibahce-mozaikleri',
    'Haleplibahçe Mozaikleri',
    'Şanlıurfa Arkeoloji Müzesi bahçesinde sergilenen muhteşem Roma dönemi mozaikleri.',
    'Roma dönemi muhteşem mozaikler',
    'Haleplibahçe, Şanlıurfa',
    'roma',
    false,
    true,
    NOW()
),
(
    gen_random_uuid(),
    'harran-ovali-evler',
    'Harran Öbekli Evler',
    'Konik kubbeli geleneksel Harran evleri. Binlerce yıllık mimari geleneğin örneği.',
    'Konik kubbeli geleneksel evler',
    'Harran, Şanlıurfa',
    'islami',
    false,
    true,
    NOW()
)
ON CONFLICT DO NOTHING;

SELECT 'Seed data inserted successfully!' as status;
