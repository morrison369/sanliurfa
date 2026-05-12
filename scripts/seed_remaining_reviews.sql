-- Yeni mekanlar için demo yorumlar
DO $$
DECLARE
  v_user_id uuid;
  v_place_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  -- Halfeti mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'halfeti-tur-tekneleri';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Muhteşem bir deneyimdi! Rum Kale''yi tekneden görmek tarifsiz.', 'active', NOW() - INTERVAL '12 days'),
      (v_user_id, v_place_id, 5, 'Halfeti''ye gelip tekne turu yapmamak olmaz. Rehber çok bilgiliydi.', 'active', NOW() - INTERVAL '5 days')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_place_id FROM places WHERE slug = 'halfeti-nehir-balik-restaurant';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Nehir kenarında taze balık yemek tam bir keyif. Fırat levreği harika.', 'active', NOW() - INTERVAL '8 days'),
      (v_user_id, v_place_id, 4, 'Manzara ve yemek iyi, servis biraz yavaş ama değer.', 'active', NOW() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_place_id FROM places WHERE slug = 'siyah-gul-kafe-halfeti';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Tekne turu sonrası buraya uğramak şart. Türk kahvesi ve manzara mükemmel.', 'active', NOW() - INTERVAL '10 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Akçakale mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'akcakale-sinir-lokantasi';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'Etli pide çok iyiydi, fiyat çok uygun. Akçakale''de en beğendiğim yer.', 'active', NOW() - INTERVAL '15 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Ceylanpınar mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'ceylanpinar-merkez-lokantasi';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 4, 'Günlük ev yemeği çok lezzetli. TİGEM ziyareti için güzel bir mola noktası.', 'active', NOW() - INTERVAL '20 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Harran mekanları
  SELECT id INTO v_place_id FROM places WHERE slug = 'harran-kumbet-evleri-kafe';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Petek evin içinde çay içmek inanılmaz bir deneyim. Fotoğraflar mükemmel çıktı!', 'active', NOW() - INTERVAL '7 days'),
      (v_user_id, v_place_id, 5, 'Harran''a geldim, burası çok etkileyici. El sanatları hediye için aldım.', 'active', NOW() - INTERVAL '2 days')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_place_id FROM places WHERE slug = 'harran-hoyuk-restaurant';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'Harran turu sonrası öğle yemeği. Kuzu çevirme nefisti, bahçe de geniş.', 'active', NOW() - INTERVAL '9 days'),
      (v_user_id, v_place_id, 4, 'Ören yeri çıkışında pratik ve lezzetli. Fiyat biraz yüksek ama konum iyi.', 'active', NOW() - INTERVAL '4 days')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_place_id FROM places WHERE slug = 'harran-tur-rehberi-merkezi';
  IF v_place_id IS NOT NULL THEN
    INSERT INTO reviews (user_id, place_id, rating, content, status, created_at) VALUES
      (v_user_id, v_place_id, 5, 'İngilizce rehber mükemmeldi. Harran tarihi hakkında derin bilgi verdi.', 'active', NOW() - INTERVAL '11 days')
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- Rating güncelle
UPDATE places p
SET rating = (
  SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.place_id = p.id AND r.status = 'active'
),
review_count = (
  SELECT COUNT(*) FROM reviews r WHERE r.place_id = p.id AND r.status = 'active'
)
WHERE p.slug IN (
  'halfeti-nehir-balik-restaurant','halfeti-butik-otel','halfeti-tur-tekneleri','siyah-gul-kafe-halfeti',
  'akcakale-sinir-lokantasi','akcakale-devlet-hastanesi-eczanesi','akcakale-carsi-kuyumcusu',
  'ceylanpinar-tarim-isletmesi-misafirhanesi','ceylanpinar-merkez-lokantasi','ceylanpinar-eczanesi',
  'harran-kumbet-evleri-kafe','harran-tur-rehberi-merkezi','harran-hoyuk-restaurant'
);
