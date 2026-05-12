-- Yeni ilçe mekanları için yorum seed
-- Mevcut demo kullanıcılardan birini kullan
DO $$
DECLARE
  v_user_id uuid;
  v_place_id int;
BEGIN
  SELECT id INTO v_user_id FROM users LIMIT 1;

  -- Hilvan mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'hilvan-carsi-eczanesi';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Hilvan''ın en iyi eczanesi. Eczacı hanım çok ilgili, her ilaç stokta.', 'approved', NOW() - INTERVAL '20 days'),
      (v_user_id, v_place_id, 4, 'Nöbet gününde de hizmet veriyorlar, çok memnun kaldım.', 'approved', NOW() - INTERVAL '10 days')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_place_id FROM places WHERE slug = 'firat-et-lokantasi-hilvan';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Tandır kebabı nefis, Hilvan''da bu kalitede başka yer yok.', 'approved', NOW() - INTERVAL '15 days'),
      (v_user_id, v_place_id, 4, 'Piyaz çok güzeldi, fiyat da makul. Tekrar geleceğiz.', 'approved', NOW() - INTERVAL '8 days')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_place_id FROM places WHERE slug = 'hilvan-cicek-pastanesi';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'Baklava çok taze ve lezzetli. Düğün için de sipariş verdik harika oldu.', 'approved', NOW() - INTERVAL '12 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Bozova mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'ozge-restaurant-bozova';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Atatürk Barajı turu sonrası geldik. Fırat balığı muhteşem, manzara da ayrı güzel.', 'approved', NOW() - INTERVAL '18 days'),
      (v_user_id, v_place_id, 5, 'Bozova''ya gelirken mutlaka uğranılacak yer. Balık tazeliği garantili.', 'approved', NOW() - INTERVAL '7 days')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_place_id FROM places WHERE slug = 'bozova-konak-otel';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'Baraj gezisi için 1 gece kaldık. Oda temiz, kahvaltı yeterliydi.', 'approved', NOW() - INTERVAL '22 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Viranşehir mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'kebapci-serhan-usta-viransehir';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Viranşehir''e her gelişimde mutlaka uğruyorum. Tandır eşsiz.', 'approved', NOW() - INTERVAL '14 days'),
      (v_user_id, v_place_id, 5, 'Şanlıurfa''nın en iyi tandır ustalarından biri. Uzak olsa da değer.', 'approved', NOW() - INTERVAL '5 days')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_place_id FROM places WHERE slug = 'viransehir-sifa-eczanesi';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'Eczacı bey çok bilgili, ilaç bulamayınca alternatif öneriyor.', 'approved', NOW() - INTERVAL '9 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Suruç mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'dicle-lokantasi-suruc';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'Tabldot menü çok dolu ve lezzetli. Fiyat uygun.', 'approved', NOW() - INTERVAL '16 days'),
      (v_user_id, v_place_id, 5, 'Suruç''ta ev yemeği arıyorsanız burası. Mercimek çorbası harika.', 'approved', NOW() - INTERVAL '6 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Birecik mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'firat-nehri-kenari-restaurant-birecik';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Fırat manzarası eşliğinde taze balık yemek paha biçilemez. Kesinlikle gelin.', 'approved', NOW() - INTERVAL '11 days'),
      (v_user_id, v_place_id, 5, 'Birecik''e geldim, yanlışlıkla buraya uğradım, doğru karar. Sazan ızgara süper.', 'approved', NOW() - INTERVAL '4 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Siverek mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'siverek-et-merkezi';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Siverek''te et alacaksanız başka yere gitmeyin. Taze ve helal.', 'approved', NOW() - INTERVAL '13 days'),
      (v_user_id, v_place_id, 4, 'Köfte hazır geldi, çok lezzetliydi. Fiyat uygun.', 'approved', NOW() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_place_id FROM places WHERE slug = 'siverek-huzur-otel';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, comment, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'İş seyahati için kaldım. Oda temiz, kahvaltı güzeldi. Tavsiye ederim.', 'approved', NOW() - INTERVAL '19 days')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Rating güncelleme
UPDATE places p
SET rating = (
  SELECT ROUND(AVG(r.rating)::numeric, 1)
  FROM reviews r WHERE r.place_id = p.id AND r.status = 'approved'
),
review_count = (
  SELECT COUNT(*) FROM reviews r WHERE r.place_id = p.id AND r.status = 'approved'
)
WHERE p.slug IN (
  'hilvan-carsi-eczanesi','firat-et-lokantasi-hilvan','hilvan-cicek-pastanesi',
  'ozge-restaurant-bozova','bozova-konak-otel',
  'kebapci-serhan-usta-viransehir','viransehir-sifa-eczanesi',
  'dicle-lokantasi-suruc',
  'firat-nehri-kenari-restaurant-birecik',
  'siverek-et-merkezi','siverek-huzur-otel'
);
