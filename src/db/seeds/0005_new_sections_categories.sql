-- ============================================
-- Yeni Kategori Bölümleri
-- saglik, egitim, ulasim, alisveris, hizmetler, emlak, konaklama
-- ============================================

-- Ana kategoriler (parent_id IS NULL)
INSERT INTO categories (name, slug, parent_id, is_active, sort_order, description) VALUES
('Sağlık', 'saglik', NULL, true, 30, 'Hastaneler, eczaneler ve sağlık hizmetleri'),
('Eğitim', 'egitim', NULL, true, 40, 'Okullar, üniversiteler ve kurslar'),
('Ulaşım', 'ulasim', NULL, true, 50, 'Otogar, havalimanı ve şehir içi ulaşım'),
('Alışveriş', 'alisveris', NULL, true, 60, 'AVM\'ler, çarşılar ve mağazalar'),
('Hizmetler', 'hizmetler', NULL, true, 70, 'Kuaför, temizlik, nakliyat ve teknik servisler'),
('Emlak', 'emlak', NULL, true, 80, 'Satılık ve kiralık konutlar, emlak ofisleri'),
('Konaklama', 'konaklama', NULL, true, 90, 'Oteller, butik tesisler ve pansiyonlar')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Sağlık alt kategorileri (parent_id = id of 'saglik')
INSERT INTO categories (name, slug, parent_id, is_active, sort_order) VALUES
('Devlet Hastaneleri', 'devlet-hastaneleri', (SELECT id FROM categories WHERE slug = 'saglik'), true, 1),
('Özel Hastaneler', 'ozel-hastaneler', (SELECT id FROM categories WHERE slug = 'saglik'), true, 2),
('Diş Klinikleri', 'dis-klinikleri', (SELECT id FROM categories WHERE slug = 'saglik'), true, 3),
('Eczaneler', 'eczaneler', (SELECT id FROM categories WHERE slug = 'saglik'), true, 4),
('Veterinerler', 'veterinerler', (SELECT id FROM categories WHERE slug = 'saglik'), true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Eğitim alt kategorileri
INSERT INTO categories (name, slug, parent_id, is_active, sort_order) VALUES
('Anaokulları', 'anaokullari', (SELECT id FROM categories WHERE slug = 'egitim'), true, 1),
('Okullar', 'okullar', (SELECT id FROM categories WHERE slug = 'egitim'), true, 2),
('Üniversiteler', 'universiteler', (SELECT id FROM categories WHERE slug = 'egitim'), true, 3),
('Dershaneler', 'dershaneler', (SELECT id FROM categories WHERE slug = 'egitim'), true, 4),
('Kurslar', 'kurslar', (SELECT id FROM categories WHERE slug = 'egitim'), true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Ulaşım alt kategorileri
INSERT INTO categories (name, slug, parent_id, is_active, sort_order) VALUES
('Otogar', 'otogar', (SELECT id FROM categories WHERE slug = 'ulasim'), true, 1),
('Havalimanı', 'havalimani', (SELECT id FROM categories WHERE slug = 'ulasim'), true, 2),
('Taksi Durakları', 'taksi-duraklari', (SELECT id FROM categories WHERE slug = 'ulasim'), true, 3),
('Araç Kiralama', 'arac-kiralama', (SELECT id FROM categories WHERE slug = 'ulasim'), true, 4),
('Otobüs Hatları', 'otobus-hatlari', (SELECT id FROM categories WHERE slug = 'ulasim'), true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Alışveriş alt kategorileri
INSERT INTO categories (name, slug, parent_id, is_active, sort_order) VALUES
('Alışveriş Merkezleri', 'avmler', (SELECT id FROM categories WHERE slug = 'alisveris'), true, 1),
('Hediyelik Eşya', 'hediyelik-esya', (SELECT id FROM categories WHERE slug = 'alisveris'), true, 2),
('Yöresel Ürünler', 'yoresel-urunler', (SELECT id FROM categories WHERE slug = 'alisveris'), true, 3),
('Kuyumcular', 'kuyumcular', (SELECT id FROM categories WHERE slug = 'alisveris'), true, 4),
('Giyim Mağazaları', 'giyim-magazalari', (SELECT id FROM categories WHERE slug = 'alisveris'), true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Hizmetler alt kategorileri
INSERT INTO categories (name, slug, parent_id, is_active, sort_order) VALUES
('Kuaförler', 'kuaforler', (SELECT id FROM categories WHERE slug = 'hizmetler'), true, 1),
('Berberler', 'berberler', (SELECT id FROM categories WHERE slug = 'hizmetler'), true, 2),
('Temizlik Firmaları', 'temizlik-firmalari', (SELECT id FROM categories WHERE slug = 'hizmetler'), true, 3),
('Nakliyat', 'nakliyat', (SELECT id FROM categories WHERE slug = 'hizmetler'), true, 4),
('Çilingir', 'cilingir', (SELECT id FROM categories WHERE slug = 'hizmetler'), true, 5),
('Elektrikçi', 'elektrikci', (SELECT id FROM categories WHERE slug = 'hizmetler'), true, 6),
('Tesisatçı', 'tesisatci', (SELECT id FROM categories WHERE slug = 'hizmetler'), true, 7)
ON CONFLICT (slug) DO NOTHING;

-- Emlak alt kategorileri
INSERT INTO categories (name, slug, parent_id, is_active, sort_order) VALUES
('Satılık Daire', 'satilik-daire', (SELECT id FROM categories WHERE slug = 'emlak'), true, 1),
('Kiralık Daire', 'kiralik-daire', (SELECT id FROM categories WHERE slug = 'emlak'), true, 2),
('Emlak Ofisleri', 'emlak-ofisleri', (SELECT id FROM categories WHERE slug = 'emlak'), true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Konaklama alt kategorileri
INSERT INTO categories (name, slug, parent_id, is_active, sort_order) VALUES
('Oteller', 'oteller', (SELECT id FROM categories WHERE slug = 'konaklama'), true, 1),
('Butik Oteller', 'butik-oteller', (SELECT id FROM categories WHERE slug = 'konaklama'), true, 2),
('Pansiyonlar', 'pansiyonlar', (SELECT id FROM categories WHERE slug = 'konaklama'), true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Yeme-icme alt kategorileri (parent_id = id of parent category 11)
INSERT INTO categories (name, slug, parent_id, is_active, sort_order) VALUES
('Kahvaltı Mekanları', 'kahvalti-mekanlari', 11, true, 10),
('Gece Açık Mekanlar', 'gece-acik-mekanlar', 11, true, 11),
('Paket Servis', 'paket-servis', 11, true, 12),
('Aile Mekanları', 'aile-mekanlari', 11, true, 13)
ON CONFLICT (slug) DO NOTHING;
