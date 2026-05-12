-- Demo reviews seed: 73 mekan için ~146 gerçekçi Türkçe yorum + rating güncelleme
-- Çalıştır: psql "$DB_URL" -f seed-prod-reviews.sql
-- Güvenli: zaten yorum olan mekanları atlar (idempotent)

DO $SEED$
DECLARE
  place_id_list UUID[];
  user_id_list UUID[] := ARRAY[
    '077a30f7-834e-40fb-9fe1-e919a3c90394'::UUID,
    '5947a52b-b96b-4c00-b92c-d985a6b9c874'::UUID,
    'b3e82a97-c812-42a2-a02b-aaffe159fa5b'::UUID,
    '6d913761-4af6-47a4-9877-646451546569'::UUID,
    '12673736-1996-4fe3-b9e5-6b73b5da1a43'::UUID,
    '2ba2cc08-a0a9-480b-91df-5091707d4854'::UUID,
    '5a91fbde-f51f-427a-8788-5dbb86d77cb8'::UUID,
    '20a280d2-536e-412a-88b8-dcd3f834aa79'::UUID
  ];

  pos_titles TEXT[] := ARRAY[
    'Harika bir deneyim!',
    'Kesinlikle tavsiye ederim',
    'Çok beğendim, tekrar geleceğim',
    'Şanlıurfa''nın en güzel yeri',
    'Muhteşem atmosfer ve hizmet',
    'Beklentilerimin çok üzerinde',
    'Her detay özenle düşünülmüş',
    'Şehrin en iyi mekanlarından'
  ];

  pos_contents TEXT[] := ARRAY[
    'Gerçekten çok beğendim. Hem hizmet kalitesi hem de atmosfer harika. Şanlıurfa''ya her geldiğimde mutlaka uğrarım.',
    'Ailemle birlikte gittik, hepimiz çok memnun kaldık. Personel güleryüzlü ve ilgili. Kesinlikle tavsiye ederim.',
    'Fiyat/performans açısından mükemmel. Bu kaliteyi bu fiyata başka yerde bulamazsınız, kesinlikle değer.',
    'Şanlıurfa''nın en güzel mekanlarından biri. Tarihi atmosfer ve modern konfor bir arada sunuluyor.',
    'Çok özel bir deneyim yaşadım. Her detay özenle düşünülmüş, personelin ilgisi ayrıca takdire şayan.',
    'Arkadaşlarımla geldik, harika vakit geçirdik. Sıcak karşılama ve kaliteli hizmet için teşekkürler.',
    'İlk ziyaretimdi ama kesinlikle son olmayacak. Burayı görmeden Şanlıurfa''yı görmüş sayılmazsınız.',
    'Hem görsel hem de atmosfer açısından mükemmeldi. Şanlıurfa''nın dokusunu en güzel yansıtan mekanlardan.',
    'Hizmet kalitesi gerçekten yüksek. Her şey eksiksizdi, bu fiyata bu kalite bulunmaz.',
    'Beklenenden çok daha güzeldi. Şanlıurfa ziyaretimin en güzel anlarından biri oldu.'
  ];

  neu_titles TEXT[] := ARRAY[
    'Genel olarak iyi bir deneyim',
    'Beklentilerimi karşıladı',
    'İyi ama geliştirilebilir',
    'Güzel bir mekan'
  ];

  neu_contents TEXT[] := ARRAY[
    'Genel olarak iyi bir yerdi. Hizmet güzeldi ama bazı eksiklikler de göze çarpıyordu. Yine de tekrar gelebilirim.',
    'Beklentilerimi tam olarak karşıladı. Keyifli bir deneyimdi, ancak daha da iyisi mümkün gibi görünüyor.',
    'Mekan temiz ve düzenliydi. Hizmet makul ama fiyatlar biraz yüksek geldi. Ortalama bir deneyim diyebilirim.',
    'Atmosfer güzeldi, personel ilgiliydi. Yoğun saatlerde servis biraz geç olabildiği için 3 verdim.'
  ];

  p_id UUID;
  pidx INT;
  u1_idx INT;
  u2_idx INT;
  rating1 INT;
  rating2 INT;
  title1 TEXT;
  title2 TEXT;
  content1 TEXT;
  content2 TEXT;
  d1 DATE;
  d2 DATE;
  inserted_count INT := 0;
  skipped_count INT := 0;
BEGIN
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO place_id_list
  FROM places WHERE status = 'active';

  IF place_id_list IS NULL THEN
    RAISE NOTICE 'Hiç yayınlanmış mekan bulunamadı!';
    RETURN;
  END IF;

  RAISE NOTICE '% yayınlanmış mekan bulundu', array_length(place_id_list, 1);

  FOR pidx IN 1..array_length(place_id_list, 1) LOOP
    p_id := place_id_list[pidx];

    -- Zaten yorumu olan mekanı atla (idempotent)
    IF (SELECT COUNT(*) FROM reviews WHERE place_id = p_id) > 0 THEN
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- İki farklı kullanıcı (rotate)
    u1_idx := ((pidx - 1) % 8) + 1;
    u2_idx := (pidx % 8) + 1;

    -- Ağırlıklı olarak 4-5 yıldız
    rating1 := CASE (pidx % 10)
      WHEN 0 THEN 3  WHEN 1 THEN 5  WHEN 2 THEN 5  WHEN 3 THEN 4
      WHEN 4 THEN 5  WHEN 5 THEN 4  WHEN 6 THEN 5  WHEN 7 THEN 5
      WHEN 8 THEN 4  WHEN 9 THEN 5  ELSE 5
    END;

    rating2 := CASE ((pidx + 3) % 10)
      WHEN 0 THEN 4  WHEN 1 THEN 5  WHEN 2 THEN 5  WHEN 3 THEN 3
      WHEN 4 THEN 5  WHEN 5 THEN 5  WHEN 6 THEN 4  WHEN 7 THEN 5
      WHEN 8 THEN 5  WHEN 9 THEN 4  ELSE 4
    END;

    IF rating1 >= 4 THEN
      title1   := pos_titles[((pidx - 1) % array_length(pos_titles, 1)) + 1];
      content1 := pos_contents[((pidx - 1) % array_length(pos_contents, 1)) + 1];
    ELSE
      title1   := neu_titles[((pidx - 1) % array_length(neu_titles, 1)) + 1];
      content1 := neu_contents[((pidx - 1) % array_length(neu_contents, 1)) + 1];
    END IF;

    IF rating2 >= 4 THEN
      title2   := pos_titles[(pidx % array_length(pos_titles, 1)) + 1];
      content2 := pos_contents[(pidx % array_length(pos_contents, 1)) + 1];
    ELSE
      title2   := neu_titles[(pidx % array_length(neu_titles, 1)) + 1];
      content2 := neu_contents[(pidx % array_length(neu_contents, 1)) + 1];
    END IF;

    -- Ziyaret tarihleri: son 6 ay içinde dağıtılmış
    d1 := CURRENT_DATE - (((pidx * 13) % 180 + 1) || ' days')::INTERVAL;
    d2 := CURRENT_DATE - (((pidx * 7)  % 120 + 1) || ' days')::INTERVAL;

    INSERT INTO reviews (place_id, user_id, title, content, rating, status, is_approved, visit_date, created_at, updated_at)
    VALUES (
      p_id, user_id_list[u1_idx], title1, content1, rating1,
      'active', true, d1,
      NOW() - (((pidx * 11) % 90 + 1) || ' days')::INTERVAL,
      NOW() - (((pidx * 11) % 90 + 1) || ' days')::INTERVAL
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO reviews (place_id, user_id, title, content, rating, status, is_approved, visit_date, created_at, updated_at)
    VALUES (
      p_id, user_id_list[u2_idx], title2, content2, rating2,
      'active', true, d2,
      NOW() - (((pidx * 5) % 90 + 1) || ' days')::INTERVAL,
      NOW() - (((pidx * 5) % 90 + 1) || ' days')::INTERVAL
    )
    ON CONFLICT DO NOTHING;

    inserted_count := inserted_count + 2;
  END LOOP;

  -- Mekan ortalama puan, sayı ve review_count güncelle
  UPDATE places SET
    rating       = sub.avg_r,
    rating_count = sub.cnt,
    review_count = sub.cnt,
    avg_rating   = sub.avg_r
  FROM (
    SELECT place_id,
           ROUND(AVG(rating)::NUMERIC, 1) AS avg_r,
           COUNT(*) AS cnt
    FROM reviews
    WHERE status = 'active'
    GROUP BY place_id
  ) sub
  WHERE places.id = sub.place_id;

  RAISE NOTICE '% yorum eklendi, % mekan atlandı', inserted_count, skipped_count;
  RAISE NOTICE 'Mekan puanları güncellendi.';
END $SEED$;
