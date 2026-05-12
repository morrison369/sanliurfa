-- Demo yorumlar: yorumsuz 321 mekana 1-2 yorum ekle
-- Kullanıcılar: mevcut 8 demo kullanıcı
-- Yorumlar: kategori bazlı havuzdan rastgele

DO $$
DECLARE
  user_ids uuid[] := ARRAY[
    '7a2816aa-d85a-481e-aa41-c89380f47d8f',
    'b3e82a97-c812-42a2-a02b-aaffe159fa5b',
    '6d913761-4af6-47a4-9877-646451546569',
    '12673736-1996-4fe3-b9e5-6b73b5da1a43',
    '2ba2cc08-a0a9-480b-91df-5091707d4854',
    '5a91fbde-f51f-427a-8788-5dbb86d77cb8',
    '5947a52b-b96b-4c00-b92c-d985a6b9c874',
    '077a30f7-834e-40fb-9fe1-e919a3c90394'
  ]::uuid[];

  yeme_comments text[] := ARRAY[
    'Urfa kebabı gerçekten nefis. Lezzetli yemekler, hızlı servis, makul fiyatlar.',
    'Yemekler çok lezzetli, porsiyon büyüklüğü tatmin edici. Tekrar geleceğim.',
    'Urfa mutfağını bu kadar özgün sunan az yer var. Lahmacun ve kebaplar çok güzel.',
    'Mekân temiz ve ferah, yemekler taze. Özellikle kebapları çok beğendim.',
    'Arkadaşlarımla geldik, hepimiz memnun ayrıldık. Fiyat/performans çok iyi.',
    'İsot biber sosu gerçekten lezzetli, yerli lezzetleri en iyi şekilde sunuyorlar.',
    'Ciğer kebabı burada bambaşka bir lezzet. Pişirme ustalığı belli.'
  ];
  konak_comments text[] := ARRAY[
    'Odalar temiz ve konforlu, personel çok yardımcı. Konumu merkeze yakın.',
    'Kahvaltı çeşitliliği harika, oda servisi hızlı. Bir sonraki ziyaretimde yine burada kalacağım.',
    'Fiyatına göre oldukça iyi bir otel. Şehir merkezine yakın, ulaşım kolay.',
    'Şanlıurfa gezimde kaldım, çok memnun ayrıldım. Personel güler yüzlü.',
    'Temiz, rahat ve merkezi konumda. Sabah kahvaltısı çok iyiydi.'
  ];
  saglik_comments text[] := ARRAY[
    'Doktorlar çok ilgili ve profesyonel. Bekleme süresi kısa, temizlik mükemmel.',
    'Sağlık personeli çok anlayışlı. Muayene süreci hızlı ilerledi.',
    'İyi bir sağlık merkezi, randevu sistemi çalışıyor. Konforlu bir ortam.',
    'Hızlı ve doğru tanı koyuldu. Personel çok ilgili ve sabırlı.'
  ];
  alisveris_comments text[] := ARRAY[
    'Geniş ürün yelpazesi ve uygun fiyatlar. Personel yardımsever.',
    'Aradığım her şeyi burada buldum. Temiz, düzenli bir mağaza.',
    'Çeşit çok, kalite yüksek. Fiyat/kalite dengesi çok iyi.',
    'Her bütçeye uygun ürün var. Kasa işlemleri hızlı, personel nazik.'
  ];
  turizm_comments text[] := ARRAY[
    'Şanlıurfa gezisi için mükemmel organizasyon. Rehber çok bilgiliydi.',
    'Halfeti turu muhteşemdi. Her şey vaktinde ve planlı gerçekleşti.',
    'Tarihi yerleri gezmek için ideal. Profesyonel ve güvenilir hizmet.',
    'Göbeklitepe ziyareti çok etkileyiciydi. Uzman rehberlik büyük fark yaratıyor.',
    'Harran köy turu için mükemmel bir deneyim. Kesinlikle tekrarlayacağım.'
  ];
  genel_comments text[] := ARRAY[
    'Hizmet kalitesi çok iyi, personel yardımsever. Kesinlikle tavsiye ederim.',
    'Fiyat/performans açısından mükemmel. Memnun ayrıldım.',
    'Bu alanda en iyi seçeneklerden biri. Kaliteli ve güvenilir.',
    'Beklentilerimin üzerinde bir hizmet. Çok memnunum.',
    'Şanlıurfa gezimde uğradığım en güzel mekanlardan biri.',
    'Personel çok ilgili, hizmet hızlı ve kaliteli. Tekrar geleceğim.',
    'Temiz, düzenli ve güvenilir. Çevreye de tavsiye ettim.',
    'Her şey çok profesyoneldi. Şehirdeki en iyi seçeneklerden.'
  ];
  dini_comments text[] := ARRAY[
    'Manevi atmosferi çok güçlü. Huzur veriyor, her ziyaretçiye tavsiye ederim.',
    'Şanlıurfa tarihi ve manevi dokusunun en değerli mekanlarından.',
    'Hz. İbrahim peygamberin izlerini taşıyan bu kutsal mekan herkesi derinden etkiliyor.'
  ];

  p RECORD;
  cat_name text;
  comment_pool text[];
  chosen_comment text;
  chosen_rating integer;
  chosen_user uuid;
  user_counter integer := 0;
  ts timestamp;
  base_ts timestamp := '2026-01-20 10:00:00'::timestamp;
  extra_review boolean;
BEGIN
  FOR p IN
    SELECT pl.id, pl.name, COALESCE(pc.name, c.name, '') as cat
    FROM app.places pl
    LEFT JOIN app.categories c ON c.id = pl.category_id
    LEFT JOIN app.categories pc ON pc.id = c.parent_id
    WHERE pl.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM app.reviews r WHERE r.place_id = pl.id)
    ORDER BY pl.name
  LOOP
    cat_name := p.cat;
    -- Kategori bazlı yorum havuzu seç
    IF cat_name ILIKE '%yeme%' OR cat_name ILIKE '%icme%' OR cat_name ILIKE '%kebap%' OR cat_name ILIKE '%pastane%' OR cat_name ILIKE '%lokanta%' OR cat_name ILIKE '%cafe%' OR cat_name ILIKE '%restoran%' THEN
      comment_pool := yeme_comments;
    ELSIF cat_name ILIKE '%konaklama%' OR cat_name ILIKE '%otel%' THEN
      comment_pool := konak_comments;
    ELSIF cat_name ILIKE '%sağlık%' OR cat_name ILIKE '%eczane%' OR cat_name ILIKE '%hastane%' THEN
      comment_pool := saglik_comments;
    ELSIF cat_name ILIKE '%alışveriş%' OR cat_name ILIKE '%market%' OR cat_name ILIKE '%avm%' THEN
      comment_pool := alisveris_comments;
    ELSIF cat_name ILIKE '%turizm%' OR cat_name ILIKE '%gezilecek%' THEN
      comment_pool := turizm_comments;
    ELSIF cat_name ILIKE '%dini%' OR cat_name ILIKE '%kültürel%' THEN
      comment_pool := dini_comments;
    ELSE
      comment_pool := genel_comments;
    END IF;

    -- İlk yorum
    chosen_comment := comment_pool[1 + floor(random() * array_length(comment_pool, 1))::int];
    chosen_rating := CASE WHEN random() > 0.3 THEN 5 ELSE 4 END;
    chosen_user := user_ids[1 + (user_counter % 8)];
    user_counter := user_counter + 1;
    ts := base_ts + (user_counter * interval '18 hours') + (random() * interval '6 hours');

    INSERT INTO app.reviews (place_id, user_id, rating, content, status, is_approved, created_at)
    VALUES (p.id, chosen_user, chosen_rating, chosen_comment, 'active', true, ts)
    ON CONFLICT DO NOTHING;

    -- %60 ihtimalle ikinci yorum
    extra_review := random() > 0.4;
    IF extra_review THEN
      chosen_comment := comment_pool[1 + floor(random() * array_length(comment_pool, 1))::int];
      chosen_rating := CASE WHEN random() > 0.4 THEN 5 ELSE 4 END;
      chosen_user := user_ids[1 + (user_counter % 8)];
      user_counter := user_counter + 1;
      ts := ts + (random() * interval '5 days') + interval '1 day';

      INSERT INTO app.reviews (place_id, user_id, rating, content, status, is_approved, created_at)
      VALUES (p.id, chosen_user, chosen_rating, chosen_comment, 'active', true, ts)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Yorumlar eklendi.';
END $$;

-- Rating ve review_count güncelle
UPDATE app.places p SET
  rating = sub.avg_rating,
  review_count = sub.cnt
FROM (
  SELECT place_id,
    ROUND(AVG(rating)::numeric, 1) as avg_rating,
    COUNT(*) as cnt
  FROM app.reviews
  WHERE is_approved = true
  GROUP BY place_id
) sub
WHERE p.id = sub.place_id;

-- Sonuç kontrolü
SELECT COUNT(*) as toplam_yorum FROM app.reviews;
SELECT COUNT(*) as hala_yorumsuz FROM app.places WHERE status = 'active' AND (review_count IS NULL OR review_count = 0);
SELECT ROUND(AVG(rating)::numeric, 2) as genel_ort_puan FROM app.places WHERE status = 'active' AND rating > 0;
