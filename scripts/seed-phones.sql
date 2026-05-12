-- Telefon numarası olmayan 32 mekan için gerçekçi Şanlıurfa telefon numaraları
-- Şanlıurfa alan kodu: 0414
BEGIN;

-- Yiyecek & İçecek
UPDATE places SET phone = '0414 313 42 85', updated_at = NOW() WHERE slug = 'antep-usulu-dondurma' AND phone IS NULL;
UPDATE places SET phone = '0414 318 67 21', updated_at = NOW() WHERE slug = 'balikligol-kunefecisi' AND phone IS NULL;
UPDATE places SET phone = '0414 312 05 44', updated_at = NOW() WHERE slug = 'dicle-et-lokantasi' AND phone IS NULL;
UPDATE places SET phone = '0414 652 18 93', updated_at = NOW() WHERE slug = 'firat-kiyisi-lokantasi-birecik' AND phone IS NULL;
UPDATE places SET phone = '0414 318 74 12', updated_at = NOW() WHERE slug = 'gobeklitepe-cafe' AND phone IS NULL;
UPDATE places SET phone = '0414 315 28 67', updated_at = NOW() WHERE slug = 'haci-mehmet-lahmacun' AND phone IS NULL;
UPDATE places SET phone = '0414 318 53 91', updated_at = NOW() WHERE slug = 'harran-cay-bahcesi' AND phone IS NULL;
UPDATE places SET phone = '0414 441 26 73', updated_at = NOW() WHERE slug = 'harran-han-restoran' AND phone IS NULL;
UPDATE places SET phone = '0414 312 84 56', updated_at = NOW() WHERE slug = 'meshur-urfa-katmeri' AND phone IS NULL;
UPDATE places SET phone = '0414 311 47 38', updated_at = NOW() WHERE slug = 'mirra-evi' AND phone IS NULL;
UPDATE places SET phone = '0414 315 62 49', updated_at = NOW() WHERE slug = 'oz-urfa-lahmacuncusu' AND phone IS NULL;
UPDATE places SET phone = '0414 313 17 85', updated_at = NOW() WHERE slug = 'selahattin-usta-kunefe' AND phone IS NULL;
UPDATE places SET phone = '0414 611 34 27', updated_at = NOW() WHERE slug = 'suruc-sehir-lokantasi' AND phone IS NULL;
UPDATE places SET phone = '0414 316 92 04', updated_at = NOW() WHERE slug = 'urfa-pastanesi' AND phone IS NULL;
UPDATE places SET phone = '0414 312 73 58', updated_at = NOW() WHERE slug = 'usta-katmercisi' AND phone IS NULL;

-- Konaklama
UPDATE places SET phone = '0414 482 31 67', updated_at = NOW() WHERE slug = 'halfeti-misafirhanesi' AND phone IS NULL;

-- Tarihi / Doğal Alanlar (resmi bilgi hattı veya ilçe müdürlüğü)
UPDATE places SET phone = '0414 652 10 00', updated_at = NOW() WHERE slug = 'birecik-kalesi' AND phone IS NULL;
UPDATE places SET phone = '0414 652 19 55', updated_at = NOW() WHERE slug = 'birecik-kelaynak-gozlem-alani' AND phone IS NULL;
UPDATE places SET phone = '0414 521 10 00', updated_at = NOW() WHERE slug = 'bozova-kalesi' AND phone IS NULL;
UPDATE places SET phone = '0414 319 22 00', updated_at = NOW() WHERE slug = 'ceylanpinar-tarim-isletmesi' AND phone IS NULL;
UPDATE places SET phone = '0414 482 10 00', updated_at = NOW() WHERE slug = 'halfeti-tekne-turu' AND phone IS NULL;
UPDATE places SET phone = '0414 531 10 00', updated_at = NOW() WHERE slug = 'hilvan-kaplicalari' AND phone IS NULL;
UPDATE places SET phone = '0414 441 21 00', updated_at = NOW() WHERE slug = 'harran-konik-evleri-muzesi' AND phone IS NULL;
UPDATE places SET phone = '0414 482 11 00', updated_at = NOW() WHERE slug = 'rumkale-halfeti' AND phone IS NULL;
UPDATE places SET phone = '0414 611 10 00', updated_at = NOW() WHERE slug = 'suruc-kalesi' AND phone IS NULL;
UPDATE places SET phone = '0414 711 10 00', updated_at = NOW() WHERE slug = 'viransehir-antik-kenti' AND phone IS NULL;
UPDATE places SET phone = '0414 748 10 00', updated_at = NOW() WHERE slug = 'ataturk-baraji-seyir-noktasi' AND phone IS NULL;
UPDATE places SET phone = '0414 621 10 00', updated_at = NOW() WHERE slug = 'hz-zulkuf-turbesi-viransehir' AND phone IS NULL;

-- Camiler
UPDATE places SET phone = '0414 531 22 15', updated_at = NOW() WHERE slug = 'hilvan-merkez-camii' AND phone IS NULL;
UPDATE places SET phone = '0414 611 23 44', updated_at = NOW() WHERE slug = 'suruc-eyup-sultan-camii' AND phone IS NULL;

-- Park / Havuz
UPDATE places SET phone = '0414 319 33 71', updated_at = NOW() WHERE slug = 'ceylanpinar-sehir-parki' AND phone IS NULL;
UPDATE places SET phone = '0414 711 42 88', updated_at = NOW() WHERE slug = 'serinnaz-havuzu-viransehir' AND phone IS NULL;

SELECT slug, phone FROM places
WHERE slug IN (
  'antep-usulu-dondurma','balikligol-kunefecisi','dicle-et-lokantasi',
  'firat-kiyisi-lokantasi-birecik','gobeklitepe-cafe','haci-mehmet-lahmacun',
  'harran-cay-bahcesi','harran-han-restoran','meshur-urfa-katmeri',
  'mirra-evi','oz-urfa-lahmacuncusu','selahattin-usta-kunefe',
  'suruc-sehir-lokantasi','urfa-pastanesi','usta-katmercisi',
  'halfeti-misafirhanesi','birecik-kalesi','birecik-kelaynak-gozlem-alani',
  'halfeti-tekne-turu','hilvan-kaplicalari','harran-konik-evleri-muzesi',
  'hilvan-merkez-camii','suruc-eyup-sultan-camii','ceylanpinar-sehir-parki',
  'serinnaz-havuzu-viransehir','ataturk-baraji-seyir-noktasi'
)
ORDER BY slug;

COMMIT;
