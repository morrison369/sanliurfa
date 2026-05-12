SELECT r.id, p.name as place_name, r.rating, LEFT(r.content, 100) as content_preview
FROM reviews r
JOIN places p ON p.id = r.place_id
WHERE r.status = 'active'
  AND (
    r.content ILIKE '%Her detay özenle%'
    OR r.content ILIKE '%bu fiyata bu kalite%'
    OR r.content ILIKE '%mükemmel bir deneyim%'
    OR r.content ILIKE '%hiç hayal kırıklığı%'
    OR r.content ILIKE '%olağanüstü bir%'
    OR r.content ILIKE '%çok etkilendim%'
    OR r.content ILIKE '%tam anlamıyla mükemmel%'
    OR r.content ILIKE '%kesinlikle öneririm%'
  )
LIMIT 25;
