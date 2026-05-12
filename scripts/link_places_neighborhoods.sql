-- Mekanları mahallelere bağla

-- Dedebağı (Eyyübiye): turistik ve dini mekanlar
UPDATE places SET neighborhood_id = (
  SELECT id FROM neighborhoods WHERE slug = 'dedebagi-mahallesi'
)
WHERE district_id = 1 AND neighborhood_id IS NULL
  AND (name ILIKE '%tarihi%' OR name ILIKE '%urfa%' OR name ILIKE '%göbek%'
    OR category_id IN (297, 329))
  AND id IN (SELECT id FROM places WHERE district_id = 1 AND neighborhood_id IS NULL
               AND (name ILIKE '%tarihi%' OR name ILIKE '%urfa%' OR name ILIKE '%göbek%'
                    OR category_id IN (297, 329))
             LIMIT 15);

-- Cumhuriyet (Eyyübiye): ticaret, yemek-içme
UPDATE places SET neighborhood_id = (
  SELECT id FROM neighborhoods WHERE slug = 'cumhuriyet-mahallesi'
)
WHERE district_id = 1 AND neighborhood_id IS NULL
  AND id IN (
    SELECT id FROM places WHERE district_id = 1 AND neighborhood_id IS NULL
    ORDER BY rating DESC NULLS LAST LIMIT 30
  );

-- Yenişehir (Haliliye): restoran, otel, pastane
UPDATE places SET neighborhood_id = (
  SELECT id FROM neighborhoods WHERE slug = 'yenisehir-mahallesi'
)
WHERE district_id = 2 AND neighborhood_id IS NULL
  AND id IN (
    SELECT id FROM places WHERE district_id = 2 AND neighborhood_id IS NULL
    ORDER BY rating DESC NULLS LAST LIMIT 25
  );

-- Güzel Mahalle (Haliliye): kalan
UPDATE places SET neighborhood_id = (
  SELECT id FROM neighborhoods WHERE slug = 'guzel-mahallesi'
)
WHERE district_id = 2 AND neighborhood_id IS NULL
  AND id IN (
    SELECT id FROM places WHERE district_id = 2 AND neighborhood_id IS NULL
    LIMIT 20
  );

-- Merkez (Karaköprü)
UPDATE places SET neighborhood_id = (
  SELECT id FROM neighborhoods WHERE slug = 'merkez-mahallesi-karakopru'
)
WHERE district_id = 3 AND neighborhood_id IS NULL
  AND id IN (
    SELECT id FROM places WHERE district_id = 3 AND neighborhood_id IS NULL
    ORDER BY rating DESC NULLS LAST LIMIT 20
  );

-- Sonuç
SELECT n.name AS mahalle, d.name AS ilce, COUNT(p.id) AS mekan_sayisi
FROM neighborhoods n
JOIN districts d ON d.id = n.district_id
LEFT JOIN places p ON p.neighborhood_id = n.id AND p.status = 'active'
GROUP BY n.id, n.name, d.name
HAVING COUNT(p.id) > 0
ORDER BY COUNT(p.id) DESC;
