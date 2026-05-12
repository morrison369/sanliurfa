-- Öne çıkan / yüksek puanlı mekanlar için ek yorumlar (2-3 yorum/mekan)

WITH demo_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users
  LIMIT 5
),
featured_places AS (
  SELECT p.id, p.slug
  FROM places p
  WHERE p.is_featured = true AND p.status = 'active'
    AND p.review_count <= 2
  LIMIT 40
)
INSERT INTO reviews (id, place_id, user_id, rating, title, content, status, created_at)
SELECT
  gen_random_uuid(),
  fp.id,
  (SELECT id FROM demo_users WHERE rn = (FLOOR(random()*5)+1)::int),
  ROUND((4.2 + random() * 0.7)::numeric, 1),
  CASE FLOOR(random()*6)::int
    WHEN 0 THEN 'Muhteşem bir deneyim'
    WHEN 1 THEN 'Her ziyaretçiye tavsiye ederim'
    WHEN 2 THEN 'Şanlıurfa''nın incisi'
    WHEN 3 THEN 'Gerçekten etkileyici'
    WHEN 4 THEN 'Harika atmosfer'
    ELSE 'Tekrar geleceğiz'
  END,
  CASE FLOOR(random()*6)::int
    WHEN 0 THEN 'Şanlıurfa''yı ziyaret eden herkesin mutlaka uğraması gereken bir mekan. Atmosfer ve hizmet mükemmel.'
    WHEN 1 THEN 'Bölgenin en güzel yerlerinden biri. Fotoğraf çekmek için de ideal bir mekan.'
    WHEN 2 THEN 'Tarihi ve kültürel açıdan çok zengin bir yer. Rehber eşliğinde gezmek daha da güzel.'
    WHEN 3 THEN 'Personel çok ilgili ve güleryüzlüydü. Mekanın temizliği ve düzeni de takdire şayan.'
    WHEN 4 THEN 'Fiyat-kalite dengesi mükemmel. Bölgedeki en iyi seçeneklerden biri olduğunu söyleyebilirim.'
    ELSE 'Ailemizle birlikte geldik, herkes çok memnun kaldı. Kesinlikle tekrar geleceğiz.'
  END,
  'active',
  NOW() - (random() * interval '60 days')
FROM featured_places fp;

-- Tarihi ve turistik mekanlar için ek yorumlar
INSERT INTO reviews (id, place_id, user_id, rating, title, content, status, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  (SELECT id FROM users ORDER BY random() LIMIT 1),
  ROUND((4.3 + random() * 0.6)::numeric, 1),
  CASE FLOOR(random()*5)::int
    WHEN 0 THEN 'Tarihi doku çok etkileyici'
    WHEN 1 THEN 'Ziyaret etmeden dönmeyin'
    WHEN 2 THEN 'Şehrin kalbi bu mekan'
    WHEN 3 THEN 'Manevi atmosfer benzersiz'
    ELSE 'Çok güzel korunmuş'
  END,
  CASE FLOOR(random()*5)::int
    WHEN 0 THEN 'Tarihi yapının korunmuşluğu ve çevresinin bakımı gerçekten etkileyici. Uzaktan gelerek pişman olmazsınız.'
    WHEN 1 THEN 'Şanlıurfa''nın tarihi dokusunu hissetmek istiyorsanız mutlaka uğrayın. Her köşesi fotoğraf çekmeye değer.'
    WHEN 2 THEN 'Bölgenin kültürel mirasını yansıtan nadide mekanlardan biri. İçinize işliyor.'
    WHEN 3 THEN 'Çocuklarımızla geldik, küçükler de büyükler de çok keyif aldı. Harika bir gün geçirdik.'
    ELSE 'Özellikle akşam saatlerinde çok güzel bir atmosfer oluyor. Kesinlikle tavsiye ederim.'
  END,
  'active',
  NOW() - (random() * interval '45 days')
FROM places p
WHERE p.slug IN (
  'balikligol-ve-goller-mevkii','gobeklitepe-arkeoloji-parki','harran-antik-kenti',
  'halfeti-ilcesi','sanliurfa-arkeoloji-muzesi','halilurrahman-camii',
  'mevlid-i-halil-camii','hz-ibrahim-makam-sanliurfa','ulu-cami-rizvaniye',
  'sira-gecesi-kultur-evi','urfa-evi-kultur-mekani','sanliurfa-kapalicarsi',
  'balikligol-hotel','grand-urfa-hotel','edessa-butik-otel',
  'sanliurfa-olimpik-yuzme-havuzu','piazza-sanliurfa-avm','ataturk-parki-botanik-bahcesi'
)
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.place_id = p.id
  AND r.created_at > NOW() - interval '10 days'
);

-- avg_rating güncelle (tüm aktif mekanlar)
UPDATE places SET avg_rating = sub.avg, review_count = sub.cnt
FROM (
  SELECT place_id, ROUND(AVG(rating)::numeric, 1) AS avg, COUNT(*) AS cnt
  FROM reviews WHERE status='active'
  GROUP BY place_id
) sub
WHERE places.id = sub.place_id AND places.status='active';

SELECT COUNT(*) AS toplam_yorum FROM reviews WHERE status='active';
SELECT ROUND(AVG(review_count),1) AS ort_yorum_per_mekan FROM places WHERE status='active';
SELECT MIN(review_count) AS min_yorum, MAX(review_count) AS max_yorum FROM places WHERE status='active';
