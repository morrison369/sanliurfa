-- Emlak + Ev + Hukuk + İş + Medya + Otomotiv + Tarım yorumları

INSERT INTO reviews (id, place_id, user_id, rating, title, content, status, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  (SELECT id FROM users ORDER BY created_at LIMIT 1),
  ROUND((3.8 + random() * 1.0)::numeric, 1),
  CASE FLOOR(random()*5)::int
    WHEN 0 THEN 'Çok memnun kaldım'
    WHEN 1 THEN 'Harika hizmet'
    WHEN 2 THEN 'Kesinlikle tavsiye ederim'
    WHEN 3 THEN 'Profesyonel ekip'
    ELSE 'Kaliteli hizmet'
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
  'remax-sanliurfa',
  'cengiz-emlak-sanliurfa',
  'sanliurfa-osb-insaat',
  'urfa-nakliyat-sanliurfa',
  'sanliurfa-temizlik-hizmetleri',
  'klima-teknik-sanliurfa',
  'ziraat-bankasi-sanliurfa-merkez',
  'garanti-bbva-sanliurfa',
  'av-mehmet-kaya-hukuk-burosu',
  'gap-organize-sanayi-bolgesi',
  'urfa-tekstil-fabrikasi',
  'sanliurfa-un-fabrikasi',
  'harran-tv-sanliurfa',
  'sanliurfa-gazetesi',
  'urfa-fm-radyosu',
  'sanliurfa-toyota-galerisi',
  'oto-ekspres-sanliurfa',
  'lastik-dunyasi-sanliurfa',
  'sanliurfa-hayvan-pazari',
  'guneydogu-veteriner-klinigi',
  'gap-tarim-urunleri-merkezi'
)
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.place_id = p.id LIMIT 1);

UPDATE places SET avg_rating = sub.avg, review_count = sub.cnt
FROM (
  SELECT place_id, ROUND(AVG(rating)::numeric, 1) AS avg, COUNT(*) AS cnt
  FROM reviews WHERE status = 'active'
  GROUP BY place_id
) sub
WHERE places.id = sub.place_id
AND places.slug IN (
  'remax-sanliurfa','cengiz-emlak-sanliurfa','sanliurfa-osb-insaat',
  'urfa-nakliyat-sanliurfa','sanliurfa-temizlik-hizmetleri','klima-teknik-sanliurfa',
  'ziraat-bankasi-sanliurfa-merkez','garanti-bbva-sanliurfa','av-mehmet-kaya-hukuk-burosu',
  'gap-organize-sanayi-bolgesi','urfa-tekstil-fabrikasi','sanliurfa-un-fabrikasi',
  'harran-tv-sanliurfa','sanliurfa-gazetesi','urfa-fm-radyosu',
  'sanliurfa-toyota-galerisi','oto-ekspres-sanliurfa','lastik-dunyasi-sanliurfa',
  'sanliurfa-hayvan-pazari','guneydogu-veteriner-klinigi','gap-tarim-urunleri-merkezi'
);

SELECT COUNT(*) AS toplam_yorum FROM reviews WHERE status='active';
SELECT COUNT(*) AS toplam_mekan FROM places WHERE status='active';
