-- Yeni ilçe mekanları için yorum seed (UUID-tabanlı)
DO $$
DECLARE
  v_user_id uuid;
  v_place_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  -- Hilvan: Çarşı Eczanesi
  SELECT id INTO v_place_id FROM places WHERE slug = 'hilvan-carsi-eczanesi';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Hilvan''ın en iyi eczanesi. Eczacı hanım çok ilgili, her ilaç stokta.', 'active', NOW() - INTERVAL '20 days'),
      (v_user_id, v_place_id, 4, 'Nöbet gününde de hizmet veriyorlar, çok memnun kaldım.', 'active', NOW() - INTERVAL '10 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Hilvan: Fırat Lokantası
  SELECT id INTO v_place_id FROM places WHERE slug = 'firat-et-lokantasi-hilvan';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Tandır kebabı nefis, Hilvan''da bu kalitede başka yer yok.', 'active', NOW() - INTERVAL '15 days'),
      (v_user_id, v_place_id, 4, 'Piyaz çok güzeldi, fiyat da makul. Tekrar geleceğiz.', 'active', NOW() - INTERVAL '8 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Bozova: Özge Restaurant
  SELECT id INTO v_place_id FROM places WHERE slug = 'ozge-restaurant-bozova';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Atatürk Barajı turu sonrası geldik. Fırat balığı muhteşem, manzara da ayrı güzel.', 'active', NOW() - INTERVAL '18 days'),
      (v_user_id, v_place_id, 5, 'Bozova''ya gelirken mutlaka uğranılacak yer. Balık tazeliği garantili.', 'active', NOW() - INTERVAL '7 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Bozova: Konak Otel
  SELECT id INTO v_place_id FROM places WHERE slug = 'bozova-konak-otel';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'Baraj gezisi için 1 gece kaldık. Oda temiz, kahvaltı yeterliydi.', 'active', NOW() - INTERVAL '22 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Viranşehir: Serhan Usta
  SELECT id INTO v_place_id FROM places WHERE slug = 'kebapci-serhan-usta-viransehir';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Viranşehir''e her gelişimde mutlaka uğruyorum. Tandır eşsiz.', 'active', NOW() - INTERVAL '14 days'),
      (v_user_id, v_place_id, 5, 'Şanlıurfa''nın en iyi tandır ustalarından biri. Uzak olsa da değer.', 'active', NOW() - INTERVAL '5 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Viranşehir: Yıldız Pastane
  SELECT id INTO v_place_id FROM places WHERE slug = 'yildiz-pastane-borekci-viransehir';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Sabah böreği çok lezzetli, Viranşehir''e gelince mutlaka uğruyorum.', 'active', NOW() - INTERVAL '9 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Suruç: Dicle Lokantası
  SELECT id INTO v_place_id FROM places WHERE slug = 'dicle-lokantasi-suruc';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'Tabldot menü çok dolu ve lezzetli. Fiyat uygun.', 'active', NOW() - INTERVAL '16 days'),
      (v_user_id, v_place_id, 5, 'Suruç''ta ev yemeği arıyorsanız burası. Mercimek çorbası harika.', 'active', NOW() - INTERVAL '6 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Birecik: Fırat Nehri Restaurant
  SELECT id INTO v_place_id FROM places WHERE slug = 'firat-nehri-kenari-restaurant-birecik';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Fırat manzarası eşliğinde taze balık yemek paha biçilemez. Kesinlikle gelin.', 'active', NOW() - INTERVAL '11 days'),
      (v_user_id, v_place_id, 5, 'Birecik''e geldim, buraya uğradım — doğru karar. Sazan ızgara süper.', 'active', NOW() - INTERVAL '4 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Siverek: Et Merkezi
  SELECT id INTO v_place_id FROM places WHERE slug = 'siverek-et-merkezi';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Siverek''te et alacaksanız başka yere gitmeyin. Taze ve helal.', 'active', NOW() - INTERVAL '13 days'),
      (v_user_id, v_place_id, 4, 'Köfte hazır geldi, çok lezzetliydi. Fiyat uygun.', 'active', NOW() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Siverek: Huzur Otel
  SELECT id INTO v_place_id FROM places WHERE slug = 'siverek-huzur-otel';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'İş seyahati için kaldım. Oda temiz, kahvaltı güzeldi. Tavsiye ederim.', 'active', NOW() - INTERVAL '19 days')
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- Rating ortalaması güncelle
UPDATE places p
SET rating = (
  SELECT ROUND(AVG(r.rating)::numeric, 1)
  FROM reviews r WHERE r.place_id = p.id AND r.status = 'active'
),
review_count = (
  SELECT COUNT(*) FROM reviews r WHERE r.place_id = p.id AND r.status = 'active'
)
WHERE p.slug IN (
  'hilvan-carsi-eczanesi','firat-et-lokantasi-hilvan','hilvan-cicek-pastanesi',
  'gunes-berber-salonu-hilvan',
  'atakent-aile-saglik-merkezi-bozova','ozge-restaurant-bozova',
  'celik-kuyumculuk-bozova','bozova-konak-otel',
  'viransehir-sifa-eczanesi','kebapci-serhan-usta-viransehir',
  'medya-spor-salonu-viransehir','yildiz-pastane-borekci-viransehir',
  'suruc-merkez-eczanesi','dicle-lokantasi-suruc',
  'guler-kuafor-suruc','suruc-pazar-carsisi',
  'firat-nehri-kenari-restaurant-birecik','birecik-kalesi-ziyaret-duragi',
  'akinci-eczanesi-birecik',
  'siverek-et-merkezi','siverek-huzur-otel','koc-kuyumculuk-siverek'
);
