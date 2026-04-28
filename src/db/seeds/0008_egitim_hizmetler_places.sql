-- ============================================
-- Eğitim ve Hizmetler Mekan Verileri
-- ============================================

-- ============================================
-- EĞİTİM: Okullar
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, is_featured, latitude, longitude)
SELECT
  v.name, v.slug,
  (SELECT id FROM categories WHERE slug = 'okullar'),
  v.district_id, v.short_description, v.address, v.phone,
  'active', true, false, v.lat, v.lng
FROM (VALUES
  ('Şehit Ahmet Güven Anadolu Lisesi', 'sehit-ahmet-guven-anadolu-lisesi', 1,
   'Eyyübiye''nin köklü anadolu lisesi.', 'Eyyübiye Merkez, Şanlıurfa', '+90 414 215 3401', 37.1500, 38.7870),
  ('Harran Anadolu İmam Hatip Lisesi', 'harran-anadolu-imam-hatip-lisesi', 1,
   'Dini ve akademik eğitimi bir arada sunan seçkin lise.', 'Yenice Mah., Eyyübiye', '+90 414 215 6700', 37.1490, 38.7861),
  ('Şanlıurfa Fen Lisesi', 'sanliurfa-fen-lisesi', 2,
   'Haliliye''deki fen ve matematik ağırlıklı seçkin lise.', 'Haliliye, Şanlıurfa', '+90 414 313 5500', 37.1630, 38.7980),
  ('Mehmetçik Anadolu Lisesi', 'mehmetcik-anadolu-lisesi', 2,
   'Şanlıurfa''nın büyük anadolu liselerinden biri.', 'Yenişehir Mah., Haliliye', '+90 414 313 4420', 37.1670, 38.8010),
  ('Karaköprü Anadolu Lisesi', 'karakopru-anadolu-lisesi', 3,
   'Karaköprü ilçesinin köklü anadolu lisesi.', 'Karaköprü Merkez', '+90 414 444 2200', 37.1930, 38.8100),
  ('Siverek Anadolu Lisesi', 'siverek-anadolu-lisesi', 4,
   'Siverek''in en büyük devlet lisesi.', 'İstasyon Cad., Siverek', '+90 414 711 1144', 37.7530, 39.3200)
) AS v(name, slug, district_id, short_description, address, phone, lat, lng)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- EĞİTİM: Üniversiteler
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, website, status, is_verified, is_featured, latitude, longitude)
VALUES
('Harran Üniversitesi', 'harran-universitesi',
 (SELECT id FROM categories WHERE slug = 'universiteler'), 1,
 'Şanlıurfa''nın tek devlet üniversitesi. 20+ fakülte, 50.000+ öğrenci.',
 'Osmanbey Kampüsü, Haliliye, Şanlıurfa', '+90 414 318 3000', 'https://www.harran.edu.tr',
 'active', true, true, 37.1760, 38.7920),
('Şanlıurfa Artuklu Üniversitesi Uzaktan Eğitim', 'sanliurfa-uzaktan-egitim',
 (SELECT id FROM categories WHERE slug = 'universiteler'), 2,
 'Uzaktan ve açık öğretim imkânları sunan eğitim merkezi.',
 'Haliliye, Şanlıurfa', '+90 414 444 9900', NULL,
 'active', false, false, 37.1650, 38.7970)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- EĞİTİM: Dershaneler / Kurslar
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, latitude, longitude)
SELECT
  v.name, v.slug,
  (SELECT id FROM categories WHERE slug = 'dershaneler'),
  v.district_id, v.short_description, v.address, v.phone,
  'active', true, v.lat, v.lng
FROM (VALUES
  ('Birikim Dershanesi', 'birikim-dershanesi', 2,
   'YKS ve LGS hazırlık kursları. Deneyimli kadro.', 'Haliliye Merkez, Şanlıurfa', '+90 414 313 7701', 37.1645, 38.7950),
  ('Kapadya Etüt Merkezi', 'kapadya-etut-merkezi', 1,
   'İlk ve ortaokul öğrencilerine etüt ve ders desteği.', 'Eyyübiye, Şanlıurfa', '+90 414 215 8802', 37.1510, 38.7875),
  ('Final Dershanesi Şanlıurfa', 'final-dershanesi-sanliurfa', 2,
   'Ulusal Final Dershaneleri zincirinin Şanlıurfa şubesi.', 'Yenişehir, Haliliye', '+90 414 313 9903', 37.1670, 38.8005)
) AS v(name, slug, district_id, short_description, address, phone, lat, lng)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- HİZMETLER: Kuaförler
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, latitude, longitude)
SELECT
  v.name, v.slug,
  (SELECT id FROM categories WHERE slug = 'kuaforler'),
  v.district_id, v.short_description, v.address, v.phone,
  'active', false, v.lat, v.lng
FROM (VALUES
  ('Akın Erkek Kuaförü', 'akin-erkek-kuaforu', 1,
   'Klasik tıraş ve saç kesimi. Ustası 20 yıllık deneyimli.', 'Dergah Cad., Eyyübiye', '+90 414 215 1101', 37.1524, 38.7882),
  ('Güneş Bayan Kuaförü', 'gunes-bayan-kuaforu', 2,
   'Bayan kuaförü ve güzellik merkezi. Randevusuz hizmet.', 'Haliliye Merkez', '+90 414 313 2202', 37.1625, 38.7960),
  ('Berber Salonu Mahmut Usta', 'berber-mahmut-usta', 3,
   'Geleneksel berber. Tıraş ve fön.', 'Karaköprü Merkez', '+90 414 444 3303', 37.1945, 38.8115)
) AS v(name, slug, district_id, short_description, address, phone, lat, lng)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- HİZMETLER: Çilingirler
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, latitude, longitude)
SELECT
  v.name, v.slug,
  (SELECT id FROM categories WHERE slug = 'cilingir'),
  v.district_id, v.short_description, v.address, v.phone,
  'active', false, v.lat, v.lng
FROM (VALUES
  ('7/24 Çilingir Servis', 'yedi-24-cilingir', 1,
   'Acil çilingir. 7/24 hizmet.', 'Eyyübiye, Şanlıurfa', '+90 414 215 0000', 37.1520, 38.7880),
  ('Karaköprü Çilingir', 'karakopru-cilingir', 3,
   'Çilingir ve kasa açma hizmeti.', 'Karaköprü', '+90 414 444 0011', 37.1940, 38.8100)
) AS v(name, slug, district_id, short_description, address, phone, lat, lng)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- HİZMETLER: Elektrikçiler
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, latitude, longitude)
SELECT
  v.name, v.slug,
  (SELECT id FROM categories WHERE slug = 'elektrikci'),
  v.district_id, v.short_description, v.address, v.phone,
  'active', false, v.lat, v.lng
FROM (VALUES
  ('Usta Elektrik', 'usta-elektrik', 2,
   'Konut ve işyeri elektrik tesisatı. Sigorta, pano, aydınlatma.', 'Haliliye, Şanlıurfa', '+90 414 313 5500', 37.1630, 38.7975),
  ('Ekrem Elektrik Haliliye', 'ekrem-elektrik', 2,
   'Arıza giderme ve tesisat kurulumu.', 'Yenişehir, Şanlıurfa', '+90 414 313 5501', 37.1665, 38.8000)
) AS v(name, slug, district_id, short_description, address, phone, lat, lng)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- HİZMETLER: Tesisatçılar
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, latitude, longitude)
SELECT
  v.name, v.slug,
  (SELECT id FROM categories WHERE slug = 'tesisatci'),
  v.district_id, v.short_description, v.address, v.phone,
  'active', false, v.lat, v.lng
FROM (VALUES
  ('Mert Tesisat', 'mert-tesisat', 1,
   'Su tesisatı, doğalgaz ve kombi servisi.', 'Eyyübiye, Şanlıurfa', '+90 414 215 7700', 37.1515, 38.7870),
  ('Karaköprü Su Tesisatı', 'karakopru-su-tesisati', 3,
   'Karaköprü ve çevre ilçelere tesisat hizmetleri.', 'Karaköprü', '+90 414 444 7701', 37.1940, 38.8095)
) AS v(name, slug, district_id, short_description, address, phone, lat, lng)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- HİZMETLER: Nakliyat
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, latitude, longitude)
SELECT
  v.name, v.slug,
  (SELECT id FROM categories WHERE slug = 'nakliyat'),
  v.district_id, v.short_description, v.address, v.phone,
  'active', false, v.lat, v.lng
FROM (VALUES
  ('Şanlıurfa Evden Eve Nakliyat', 'sanliurfa-evden-eve', 2,
   'Şehir içi ve şehirlerarası evden eve nakliyat.', 'Haliliye, Şanlıurfa', '+90 414 313 9900', 37.1640, 38.7985),
  ('GAP Nakliyat', 'gap-nakliyat', 1,
   'Ticari ve ev taşımacılığı, depolama.', 'Eyyübiye, Şanlıurfa', '+90 414 215 9901', 37.1525, 38.7878)
) AS v(name, slug, district_id, short_description, address, phone, lat, lng)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- KONAKLAMA: Oteller
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, website, status, is_verified, is_featured, latitude, longitude)
SELECT
  v.name, v.slug,
  (SELECT id FROM categories WHERE slug = 'oteller'),
  v.district_id, v.short_description, v.address, v.phone, v.website,
  'active', true, v.featured, v.lat, v.lng
FROM (VALUES
  ('Hilton Garden Inn Şanlıurfa', 'hilton-garden-inn-sanliurfa', 2,
   'Şehir merkezinde 5 yıldızlı konfor. Havuz, spa, restoran.',
   'Haliliye Merkez, Şanlıurfa', '+90 414 318 0000', NULL, true, 37.1648, 38.7963),
  ('Hanehan Butik Otel', 'hanehan-butik-otel', 1,
   'Dergah yakınında tarihi handa benzersiz konaklama. Taş mimarisi.',
   'Dergah Cad., Eyyübiye', '+90 414 216 9000', NULL, true, 37.1521, 38.7886),
  ('Manici Hotel', 'manici-hotel', 1,
   'Balıklıgöl''e yürüme mesafesinde. Aile dostu fiyatlar.',
   'Eyyübiye Merkez, Şanlıurfa', '+90 414 215 1500', NULL, false, 37.1515, 38.7880),
  ('Grand Urfa Hotel', 'grand-urfa-hotel', 2,
   'Haliliye''de şehir oteli. Otopark ve toplantı salonu.',
   'Haliliye, Şanlıurfa', '+90 414 313 3300', NULL, false, 37.1635, 38.7972),
  ('Kültür Otel Şanlıurfa', 'kultur-otel-sanliurfa', 1,
   'Merkezi konumuyla uygun fiyatlı şehir oteli.',
   'Sarayönü Cad., Eyyübiye', '+90 414 215 4400', NULL, false, 37.1510, 38.7868)
) AS v(name, slug, district_id, short_description, address, phone, website, featured, lat, lng)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- KONAKLAMA: Pansiyonlar
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, latitude, longitude)
SELECT
  v.name, v.slug,
  (SELECT id FROM categories WHERE slug = 'pansiyonlar'),
  v.district_id, v.short_description, v.address, v.phone,
  'active', false, v.lat, v.lng
FROM (VALUES
  ('Urfa Konuk Evi', 'urfa-konuk-evi', 1,
   'Tarihi mahallede sıcak pansiyon. Kahvaltı dahil.',
   'Eyyübiye, Şanlıurfa', '+90 414 215 6601', 37.1518, 38.7875),
  ('Dergah Konuk Evi', 'dergah-konuk-evi', 1,
   'Balıklıgöl yakınında uygun fiyatlı pansiyon.',
   'Dergah Mah., Eyyübiye', '+90 414 215 6602', 37.1523, 38.7889)
) AS v(name, slug, district_id, short_description, address, phone, lat, lng)
ON CONFLICT (slug) DO NOTHING;
