-- Dini-Kültürel + Alışveriş/Eğitim/Eğlence/Spor mekanları için demo yorumlar

INSERT INTO reviews (id, place_id, user_id, rating, title, content, status, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  (SELECT id FROM users ORDER BY created_at LIMIT 1),
  ROUND((4.0 + random())::numeric, 1),
  CASE FLOOR(random()*5)::int
    WHEN 0 THEN 'Çok memnun kaldım'
    WHEN 1 THEN 'Harika bir deneyim'
    WHEN 2 THEN 'Kesinlikle tavsiye ederim'
    WHEN 3 THEN 'Beklentilerimin üzerinde'
    ELSE 'Tekrar geleceğim'
  END,
  CASE FLOOR(random()*5)::int
    WHEN 0 THEN 'Şanlıurfa''ya geldiğimizde mutlaka uğradık, çok memnun kaldık.'
    WHEN 1 THEN 'Hizmet kalitesi ve personel ilgisi gerçekten etkileyiciydi.'
    WHEN 2 THEN 'Beklentilerimin üzerinde bir deneyim oldu, kesinlikle tavsiye ederim.'
    WHEN 3 THEN 'Temizlik ve düzen konusunda gayet iyiydiler, memnun ayrıldık.'
    ELSE 'Fiyat/performans açısından bölgede en iyi seçenek diyebilirim.'
  END,
  'active',
  NOW() - (random() * interval '90 days')
FROM places p
WHERE p.slug IN (
  'ulu-cami-rizvaniye',
  'halilurrahman-camii',
  'mevlid-i-halil-camii',
  'eyup-sultan-camii-sanliurfa',
  'hz-ibrahim-makam-sanliurfa',
  'seyh-omer-turbesi',
  'mehmet-arap-medresesi',
  'sanliurfa-kultur-sanat-merkezi',
  'urfa-evi-kultur-mekani',
  'piazza-sanliurfa-avm',
  'sanliurfa-kapalicarsi',
  'bakırcilar-carsisi-sanliurfa',
  'altin-carsisi-sanliurfa',
  'urfa-hal-sebze-meyve-pazari',
  'sanliurfa-teknoloji-carsisi',
  'urfa-hali-kilim-carsisi',
  'harran-universitesi',
  'sanliurfa-il-halk-kutuphanesi',
  'sanliurfa-anadolu-imam-hatip-lisesi',
  'harran-ingilizce-dil-kursu',
  'piazza-sinema-sanliurfa',
  'sanliurfa-sehir-tiyatrosu',
  'ataturk-parki-botanik-bahcesi',
  'sira-gecesi-kultur-evi',
  'sanliurfa-olimpik-yuzme-havuzu',
  'mega-fitness-sanliurfa',
  'sanliurfa-sehir-stadyumu',
  'dovus-sporlari-akademisi-sanliurfa'
)
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.place_id = p.id LIMIT 1);

-- avg_rating güncelle
UPDATE places SET avg_rating = sub.avg, review_count = sub.cnt
FROM (
  SELECT place_id, ROUND(AVG(rating)::numeric, 1) AS avg, COUNT(*) AS cnt
  FROM reviews WHERE status = 'active'
  GROUP BY place_id
) sub
WHERE places.id = sub.place_id
AND places.slug IN (
  'ulu-cami-rizvaniye',
  'halilurrahman-camii',
  'mevlid-i-halil-camii',
  'eyup-sultan-camii-sanliurfa',
  'hz-ibrahim-makam-sanliurfa',
  'seyh-omer-turbesi',
  'mehmet-arap-medresesi',
  'sanliurfa-kultur-sanat-merkezi',
  'urfa-evi-kultur-mekani',
  'piazza-sanliurfa-avm',
  'sanliurfa-kapalicarsi',
  'bakırcilar-carsisi-sanliurfa',
  'altin-carsisi-sanliurfa',
  'urfa-hal-sebze-meyve-pazari',
  'sanliurfa-teknoloji-carsisi',
  'urfa-hali-kilim-carsisi',
  'harran-universitesi',
  'sanliurfa-il-halk-kutuphanesi',
  'sanliurfa-anadolu-imam-hatip-lisesi',
  'harran-ingilizce-dil-kursu',
  'piazza-sinema-sanliurfa',
  'sanliurfa-sehir-tiyatrosu',
  'ataturk-parki-botanik-bahcesi',
  'sira-gecesi-kultur-evi',
  'sanliurfa-olimpik-yuzme-havuzu',
  'mega-fitness-sanliurfa',
  'sanliurfa-sehir-stadyumu',
  'dovus-sporlari-akademisi-sanliurfa'
);

SELECT COUNT(*) AS toplam_yorum FROM reviews WHERE status='active';
SELECT COUNT(*) AS toplam_mekan FROM places WHERE status='active';
