-- Assign approximate coordinates to 37 places missing lat/lng
-- Using district center + small random jitter (±0.005° ≈ ±500m)

-- Eyyübiye (id=1) — Balıklıgöl çevresi, tarihi merkez
UPDATE places SET
  latitude  = 37.1558 + (random() * 0.010 - 0.005),
  longitude = 38.7873 + (random() * 0.012 - 0.006)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 1;

-- Haliliye (id=2) — Yenişehir, idari merkez
UPDATE places SET
  latitude  = 37.1615 + (random() * 0.010 - 0.005),
  longitude = 38.7980 + (random() * 0.012 - 0.006)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 2;

-- Karaköprü (id=3) — kuzeydoğu, üniversite çevresi
UPDATE places SET
  latitude  = 37.1850 + (random() * 0.012 - 0.006),
  longitude = 38.8350 + (random() * 0.012 - 0.006)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 3;

-- Siverek (id=4)
UPDATE places SET
  latitude  = 37.7560 + (random() * 0.010 - 0.005),
  longitude = 39.3170 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 4;

-- Viranşehir (id=5)
UPDATE places SET
  latitude  = 37.2270 + (random() * 0.010 - 0.005),
  longitude = 39.7650 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 5;

-- Suruç (id=6)
UPDATE places SET
  latitude  = 36.9680 + (random() * 0.010 - 0.005),
  longitude = 38.4180 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 6;

-- Birecik (id=7)
UPDATE places SET
  latitude  = 37.0243 + (random() * 0.010 - 0.005),
  longitude = 37.9920 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 7;

-- Akçakale (id=8)
UPDATE places SET
  latitude  = 36.7110 + (random() * 0.008 - 0.004),
  longitude = 38.9480 + (random() * 0.008 - 0.004)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 8;

-- Ceylanpınar (id=9)
UPDATE places SET
  latitude  = 36.8430 + (random() * 0.010 - 0.005),
  longitude = 40.0380 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 9;

-- Hilvan (id=10)
UPDATE places SET
  latitude  = 37.5810 + (random() * 0.010 - 0.005),
  longitude = 38.9650 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 10;

-- Bozova (id=11)
UPDATE places SET
  latitude  = 37.3480 + (random() * 0.010 - 0.005),
  longitude = 38.5060 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 11;

-- Halfeti (id=12)
UPDATE places SET
  latitude  = 37.2640 + (random() * 0.010 - 0.005),
  longitude = 37.8720 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 12;

-- Harran (id=13)
UPDATE places SET
  latitude  = 36.8630 + (random() * 0.010 - 0.005),
  longitude = 39.0280 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active'
  AND district_id = 13;

-- Fallback: any remaining without district_id → city center
UPDATE places SET
  latitude  = 37.1591 + (random() * 0.010 - 0.005),
  longitude = 38.7969 + (random() * 0.010 - 0.005)
WHERE (latitude IS NULL OR longitude IS NULL)
  AND status = 'active';

SELECT COUNT(*) AS remaining_no_coords FROM places
WHERE (latitude IS NULL OR longitude IS NULL) AND status = 'active';
