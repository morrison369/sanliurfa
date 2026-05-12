-- Yorumları 8 demo kullanıcıya eşit dağıt
-- Önceki seed'lerde (SELECT id FROM users ORDER BY created_at LIMIT 1) ile atanan
-- yorumlar 8 kullanıcıya round-robin ile yeniden atanır.

BEGIN;

WITH first_user AS (
  SELECT id FROM users ORDER BY created_at LIMIT 1
),
ranked AS (
  SELECT
    id,
    ((ROW_NUMBER() OVER (ORDER BY created_at, id::text) - 1) % 8)::int AS bucket
  FROM reviews
  WHERE user_id = (SELECT id FROM first_user)
),
user_map (bucket, uid) AS (
  VALUES
    (0, '077a30f7-834e-40fb-9fe1-e919a3c90394'::uuid),
    (1, '5947a52b-b96b-4c00-b92c-d985a6b9c874'::uuid),
    (2, 'b3e82a97-c812-42a2-a02b-aaffe159fa5b'::uuid),
    (3, '6d913761-4af6-47a4-9877-646451546569'::uuid),
    (4, '12673736-1996-4fe3-b9e5-6b73b5da1a43'::uuid),
    (5, '2ba2cc08-a0a9-480b-91df-5091707d4854'::uuid),
    (6, '5a91fbde-f51f-427a-8788-5dbb86d77cb8'::uuid),
    (7, '20a280d2-536e-412a-88b8-dcd3f834aa79'::uuid)
)
UPDATE reviews r
SET user_id = um.uid
FROM ranked rk
JOIN user_map um ON um.bucket = rk.bucket
WHERE r.id = rk.id;

-- Doğrulama
SELECT user_id, COUNT(*) AS review_sayisi
FROM reviews
GROUP BY user_id
ORDER BY review_sayisi DESC;

COMMIT;
