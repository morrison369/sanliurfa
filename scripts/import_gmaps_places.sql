-- GÜNCELLEME: Mevcut mekanların eksik bilgilerini tamamla
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 314 14 44'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.7 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Şıh''ın Yeri Yanı - Taksi Durağı Arkası, Osman Gazi, Emniyet Cd. 404 sk, 63000, Emniyet Cd., 63300 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Karaköprü Pastanesi - Emniyet Caddesi Şubesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0543 312 99 04'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:00–22:00; Cumartesi08:00–22:00; Pazar08:00–22:00; Pazartesi08:00–22:00; Salı08:00–22:00; Çarşamba08:00–22:00; Perşembe08:00–22:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.1 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Bahçelievler Mahallesi, Bahçelievler Mh. 113.sok. İlginoğlu ap, 63100 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'ŞANLIURFA PASTANESİ';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0543 515 15 70'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.2 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Çankaya, Gaffar Okan Cd. No:14, 63320 Karaköprü/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Karaköprü Pastanesi ve Kahvaltı';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0537 453 63 34'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma07:00–00:00; Cumartesi07:00–00:00; Pazar07:30–00:00; Pazartesi07:00–23:45; Salı07:00–23:45; Çarşamba07:00–23:45; Perşembe07:00–23:45'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 546. Sk. No:45, 63040, 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'İnci pastanesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 347 00 40'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma05:00–01:00; Cumartesi05:00–01:00; Pazar05:00–01:00; Pazartesi05:00–01:00; Salı05:00–01:00; Çarşamba05:00–01:00; Perşembe05:00–01:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'No:Karaköprü 35 metre yol üzeri no 2, Narlıkuyu, Eyyüpoğlu caddesi, 63330 Karaköprü/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Osmanlı Pastanesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0542 232 72 44'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma06:00–01:00; Cumartesi06:00–01:00; Pazar06:00–01:00; Pazartesi06:00–01:00; Salı06:00–01:00; Çarşamba06:00–01:00; Perşembe06:00–01:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'İpekyol, İpekyol Blv. 2332. Sokak, 63050 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'BURÇAK FIRIN PATİSSERİE';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 314 08 08'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:30–20:00; Cumartesi08:30–20:00; Pazar08:30–20:00; Pazartesi08:30–20:00; Salı08:30–20:00; Çarşamba08:30–20:00; Perşembe08:30–20:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.3 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Osman Gazi, Emniyet Cd. 39 A, 63300 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Şahanoglu Kuyumculuk';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0544 744 84 84'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:00–19:00; Cumartesi08:00–19:00; PazarKapalı; Pazartesi08:00–19:00; Salı08:00–19:00; Çarşamba08:00–19:00; Perşembe08:00–19:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Ulubatlı Mah emniyet caddesi hande apartman altı, no:57/b, 63300 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'ÇİÇEK KUYUMCULUK';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 216 55 04'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar09:00–17:00; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Sarayönü Caddesi Kapaklı Pasaj Karşısı No:6, 63210 Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Zahter Kuyumculuk';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 216 50 20'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–19:00; Cumartesi09:00–19:00; PazarKapalı; Pazartesi09:00–19:00; Salı09:00–19:00; Çarşamba09:00–19:00; Perşembe09:00–19:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.7 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Kamberiye, Haşimiye Meydanı/özdiker Kuyumcular Çarşısı D:56/p, 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Ekinci Kuyumcu';
UPDATE places SET opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–19:00; Cumartesi09:00–19:00; PazarKapalı; Pazartesi09:00–19:00; Salı09:00–19:00; Çarşamba09:00–19:00; Perşembe09:00–19:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 3.3 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Ulubatlı, Emniyet Cd. No:51, 63300 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Çankaya Kuyumculuk';
UPDATE places SET opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:30–20:30; Cumartesi08:30–20:30; Pazar08:30–20:30; Pazartesi08:30–20:30; Salı08:30–20:30; Çarşamba08:30–20:30; Perşembe08:30–20:30'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Camii Kebir Mahallesi, Divanyolu Cd. no:22/B, 63330 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Badıllı Kuyumculuk';
UPDATE places SET address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Google Haritalar';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 502 12 12'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma10:00–22:00; Cumartesi10:00–22:00; Pazar10:00–22:00; Pazartesi10:00–22:00; Salı10:00–22:00; Çarşamba10:00–22:00; Perşembe10:00–22:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 3.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Bamyasuyu, 18 Mart Çanakkale Cd No:2, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Novada Park Şanlıurfa Alışveriş Merkezi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '444 8 780'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma10:00–22:00; Cumartesi10:00–22:00; Pazar10:00–22:00; Pazartesi10:00–22:00; Salı10:00–22:00; Çarşamba10:00–22:00; Perşembe10:00–22:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.2 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karakoyunlu, 11 Nisan Fuar Cd. No:42, 63200 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Piazza Şanlıurfa';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0542 235 89 02'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma07:00–23:00; Cumartesi07:00–23:00; Pazar07:00–23:00; Pazartesi07:00–23:00; Salı07:00–23:00; Çarşamba07:00–23:00; Perşembe07:00–23:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'No:, Sırrın, Recep Tayyip Erdoğan Blv. No:238, 63050 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'URFA METRO';
UPDATE places SET rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 505. Sk. No:22, 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Avm Merkezi';
UPDATE places SET opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–23:00; Cumartesi09:00–23:00; Pazar10:00–23:00; Pazartesi09:00–23:00; Salı09:00–23:00; Çarşamba09:00–23:00; Perşembe09:00–23:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Esentepe, 303. Sk. No:10, 63330 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Mozaik Avm';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0553 054 70 75'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–02:00; Cumartesi09:00–02:00; Pazar09:00–02:00; Pazartesi09:00–02:00; Salı09:00–02:00; Çarşamba09:00–02:00; Perşembe09:00–02:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 3.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 593 Sokak No:3/a, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Deniz Doğal Dondurma';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 314 14 14'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.3 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Ulubatlı Bulvar Apartmanı, Ulubatlı, Emniyet Cd. 17B, 63300 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Miroğlu Kadayıf & Dondurma | Haliliye';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 215 22 13'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:00–02:00; Cumartesi08:00–02:00; Pazar08:00–02:00; Pazartesi08:00–02:00; Salı08:00–02:00; Çarşamba08:00–02:00; Perşembe08:00–02:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 3.8 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Yusufpaşa, Sarayönü Cd. 42 B, 63210 Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Dondurmacı Zeki';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0545 413 01 67'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma12:00–00:00; Cumartesi12:00–00:00; Pazar12:00–00:00; Pazartesi12:00–00:00; Salı12:00–00:00; Çarşamba12:00–02:00; Perşembe12:00–00:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.7 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Sırrın, 644. Sk. No:19 D:a, 63050 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Görkem2 Künefe & Dondurma';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0535 430 03 63'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma12:30–00:00; Cumartesi12:30–00:00; PazarKapalı; Pazartesi12:30–00:00; Salı12:30–00:00; Çarşamba12:30–00:00; Perşembe12:30–00:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.8 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Şair Nabi, 187. Sk., 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'HOCAOĞLU KÜNEFE & DONDURMA ( HALİLİYE / MERKEZ )';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0544 822 82 82'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma10:00–23:30; Cumartesi10:00–23:30; Pazar10:00–23:30; Pazartesi10:00–23:30; Salı10:00–23:30; Çarşamba10:00–23:30; Perşembe10:00–23:30'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Mehmet Akif Ersoy Caddesi Eyüp, Hamidiye, Sultan Apt No:17/B, 63050 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Misdon Dondurma Şanlıurfa Fabrika Satış Noktası';
UPDATE places SET rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 505. Sk. No:86, 63050 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Karşıyaka Cami';
UPDATE places SET rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 531. Sk. No:82, 63050 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Abdurrahman Yavuz Taziye Evi ve Camii';
UPDATE places SET rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 576. Sk. No:12, 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'H. Hasari Yıldız Cami';
UPDATE places SET rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Sırrın, Recep Tayyip Erdoğan Blv. No:200, 63050 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Sırrın Cami';
UPDATE places SET address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 573. Sk. No:5, 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Hasan Yıldız Cami';
UPDATE places SET rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.7 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'İmam Bakır, 667. Sk. No:7, 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Gül Muhammed Cami';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 318 50 00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.1 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karakoyunlu, 11 Nisan Fuar Cd. No:54, 63100 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Hilton Garden Inn Şanlıurfa';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0542 397 57 89'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Aslan Konukevi, Camikebir, 1351. Sk. No:10, 63210 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Aslan Konukevi Otel & Sıra Gecesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 216 35 35'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'sarayönü caddesi, Yusufpaşa, 916. Sk. No:14, 63210 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Beyzade Konak Otel';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 318 50 00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.1 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karakoyunlu, 11 Nisan Fuar Cd. No:54, 63100 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Hilton Garden Inn Şanlıurfa';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0545 503 37 64'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Kadıoğlu, 926. Sk. No:23, 63210 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Şark Çırağan Konağı';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0533 788 12 69'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Yusufpaşa, 926. Sk. No:27, 63210 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Karagül Otel';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 313 15 88'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:30–17:00; Cumartesi08:30–17:00; Pazar08:30–17:00; Pazartesi08:30–17:00; Salı08:30–17:00; Çarşamba08:30–17:00; Perşembe08:30–17:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.8 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Haleplibahçe, 2372. Sk. No:74/1, 63200 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Şanlıurfa Arkeoloji Müzesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 313 15 88'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:30–17:30; Cumartesi08:30–17:30; Pazar08:30–17:30; Pazartesi08:30–17:30; Salı08:30–17:30; Çarşamba08:30–17:30; Perşembe08:30–17:30'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.7 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Haleplibahçe, 2372. Sk. 74/1, 63200 Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Haleplibahçe Mozaik Müzesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 313 15 88'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:30–17:00; Cumartesi08:30–17:00; Pazar08:30–17:00; Pazartesi08:30–17:00; Salı08:30–17:00; Çarşamba08:30–17:00; Perşembe08:30–17:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.7 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Örencik, 63290 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Göbeklitepe';
UPDATE places SET opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–17:00; Cumartesi09:00–17:00; Pazar09:00–17:00; PazartesiKapalı; Salı09:00–17:00; Çarşamba09:00–17:00; Perşembe09:00–17:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Camikebir, 1349. Sk. No:3, 63210 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Mutfak Müzesi';
UPDATE places SET opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:00–17:00; Cumartesi09:00–17:00; PazarKapalı; PazartesiKapalı; Salı08:00–17:00; Çarşamba08:00–17:00; Perşembe08:00–17:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Beykapusu, 970. Sk. No:43, 63210 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Urfa Kent Müzesi';
UPDATE places SET opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:30–12:0013:00–18:00; Cumartesi09:30–12:0013:00–18:00; Pazar09:30–12:0013:00–18:00; PazartesiKapalı; Salı09:30–12:0013:00–18:00; Çarşamba09:30–12:0013:00–18:00; Perşembe09:30–12:0013:00–18:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.3 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Doğukent Mahallesi, 105. Cadde, Yaşam Park İçi, 63320 Karaköprü/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Müslüm Gürses Müzesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0539 879 00 00'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–20:00; Cumartesi09:00–20:00; PazarKapalı; Pazartesi09:00–20:00; Salı09:00–20:00; Çarşamba09:00–20:00; Perşembe09:00–20:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Şanmed Hastanesi Karşısı, Ulubatlı, Yunus Emre Cd. Baraj Apt. Altı No:83/D, 63300 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Optimax Optik';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0544 314 04 15'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'şanmed hastanesi yani, Ertuğrul Gazi, Yunus Emre Cd., 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Elif Optik 1';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0530 406 00 57'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:30–19:30; Cumartesi08:00–19:30; PazarKapalı; Pazartesi08:00–19:30; Salı08:00–19:30; Çarşamba08:00–19:30; Perşembe08:30–19:30'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Ulubatlı, Yunus Emre Cd. 83/B, 63300 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Emin OPTİK';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0506 909 30 63'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma10:00–22:00; Cumartesi10:00–22:00; Pazar10:00–22:00; Pazartesi10:00–22:00; Salı10:00–22:00; Çarşamba10:00–22:00; Perşembe10:00–22:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karakoyunlu, 11 Nisan Fuar Cd. Piazza alışveriş merkezi 42 / 134 Kat:2, 63200 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Lüks Optik';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 314 50 05'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:30–19:00; Cumartesi08:30–19:00; PazarKapalı; Pazartesi08:30–19:00; Salı08:30–19:00; Çarşamba08:30–19:00; Perşembe08:30–19:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.8 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Prof. Abdülkadir Karahan Caddesi, 63100' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Enver Optik';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 214 25 63'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma10:00–22:00; Cumartesi10:00–22:00; Pazar10:00–22:00; Pazartesi10:00–22:00; Salı10:00–22:00; Çarşamba10:00–22:00; Perşembe10:00–22:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.3 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Bamyasuyu, 18 Mart Çanakkale Cd Novada Park AVM No:2/M, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Atasun Optik';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0501 155 73 36'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–21:30; Cumartesi09:00–21:30; Pazar09:00–21:30; Pazartesi09:00–21:30; Salı09:00–21:30; Çarşamba09:00–21:30; Perşembe09:00–21:30'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.8 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Platin Yonca Apartmanı, Narlıkuyu, Mehmet Hafız Blv. No:78/12, 63300 Karaköprü/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Mabel çiçek şanlıurfa';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0544 501 72 47'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karşıyaka Mahallesi, DEDEOSMAN, AVNİ CADDESİ 6BA, 63050 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Florya Çiçekçilik & Çikolata';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0544 773 49 43'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 590. Sk. No:63000, 63050 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Buket çiçekçilik';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0544 501 72 47'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Lalezar Evleri Bitişiği, Karsıyaka, DEDEOSMAN AVNİ CADDESİ 6BA, 63050 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Urfa Karşıyaka Çiçekçi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0501 179 93 63'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:00–23:00; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi08:00–23:00; Salı08:00–23:00; Çarşamba08:00–23:00; Perşembe08:00–23:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Kanalboyu kafeler yanı Bi hava Cafe arası Winner Cafe yanı, Sırrın, Karsıyaka, 590. Sk. Erahanoğlu apt. Altı No:20/A, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Çiçek Lab & Çikolata';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0544 314 84 84'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:00–22:00; Cumartesi08:00–22:00; Pazar08:00–21:00; Pazartesi08:00–22:00; Salı08:00–22:00; Çarşamba08:00–22:00; Perşembe08:00–22:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Yenişehir, Emniyet Cd. Polayitkan Apt Altı 66/D, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Urfa Çiçekçi Mustafa';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0552 920 18 08'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.3 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karşıyaka Mahallesi, Karşıyaka Sokak. NO:33A TİC:75, 63300 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'ŞANLIURFA GEZİ DURAĞI';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0538 709 70 78'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Şimaliye, 63950 Halfeti/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Halfeti Rum Kale Uygun Fiyata Tekne Turu Mehmet Kaptan';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0538 814 17 94'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma07:00–22:00; Cumartesi07:00–22:00; Pazar07:00–22:00; Pazartesi07:00–22:00; Salı07:00–22:00; Çarşamba07:00–22:00; Perşembe07:00–22:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Rüştiye, 63950 Halfeti/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Rumkale Halfeti Teknede Evlilik Teklifi Organizasyon';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0531 775 92 90'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Şimaliye, Atatürk Cd., 63950, 63000 Halfeti/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Halfeti Rumkale Tekne Turları';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0535 698 22 59'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:30–18:00; Cumartesi07:00–19:00; Pazar07:00–19:00; Pazartesi08:30–18:00; Salı08:30–18:00; Çarşamba08:30–18:00; Perşembe08:30–18:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Eski, Rüştiye, 63950 Halfeti/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'HALFETİ KOÇAK TEKNE TURU';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0541 258 22 79'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma07:00–23:00; Cumartesi07:00–23:00; Pazar07:00–23:00; Pazartesi07:00–23:00; Salı07:00–23:00; Çarşamba07:00–23:00; Perşembe07:00–23:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.1 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Rüştiye, 63950 Halfeti/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Halfeti Siyah Gül Tekne Turları';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0544 590 63 63'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Bamyasuyu Mahallesi Cumhuriyet Cad, 128. Sk. No:1/54, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Mitratur Şanlıurfa';
UPDATE places SET rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 520. Sk. No:6, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Afat Turizm';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 216 75 00'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–21:00; Cumartesi09:00–21:00; Pazar11:30–17:00; Pazartesi09:00–21:00; Salı09:00–21:00; Çarşamba09:00–21:00; Perşembe09:00–21:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Kamberiye, Harran Ünv. Cd. 62/2, 63200 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Nevali Turizm Seyahat Acentası';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0850 533 0510'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–19:00; Cumartesi10:00–16:00; PazarKapalı; Pazartesi09:00–19:00; Salı09:00–19:00; Çarşamba09:00–19:00; Perşembe09:00–19:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Paşabağı, Adalet Cd. Konak Plaza Altı No:17/A, 63300 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'BONEGA';
UPDATE places SET opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–17:30; CumartesiKapalı; PazarKapalı; Pazartesi09:00–17:30; Salı09:00–17:30; Çarşamba09:00–17:30; Perşembe09:00–17:30'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.9 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'GÜMÜŞOLUK TURİZM HAC-UMRE';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0532 403 26 86'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–21:00; Cumartesi09:00–21:00; Pazar09:00–21:00; Pazartesi09:00–21:00; Salı09:00–21:00; Çarşamba09:00–21:00; Perşembe09:00–21:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Pınarbaşı, 1214. Sokak,gümrükhan, kat 2 no 56, 63100 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Seba travel';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0541 644 63 03'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Refahiye, 283. Sk. No:5/B B-3, 63300 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Çetiner Turizm Acentesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0544 784 70 90'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:00–00:00; Cumartesi08:00–00:00; Pazar08:00–00:00; Pazartesi08:00–00:00; Salı08:00–00:00; Çarşamba08:00–00:00; Perşembe08:00–00:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Camikebir, 1351. Sk. No:3, 63320 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Sultanbey Konuk Evi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0542 204 30 54'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Pınarbaşı, Balıklı Göl Cd, 1211. Sk. No:1/A, 63210 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'BİRİNCİ CİĞER & KEBAP';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 312 68 68'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:00–00:00; Cumartesi08:00–00:00; Pazar08:00–00:00; Pazartesi08:00–00:00; Salı08:00–00:00; Çarşamba08:00–00:00; Perşembe08:00–00:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Paşabağı, Mevlana Cd. No:28/B, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'LİVVA CİĞER KEBAP RESTAURANT ŞANLIURFA';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0505 414 44 14'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma12:00–22:00; Cumartesi09:00–22:00; Pazar09:00–22:00; Pazartesi12:00–22:00; Salı12:00–22:00; Çarşamba12:00–22:00; Perşembe12:00–22:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.8 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Kurtuluş, Kazancı Bedih Sk. No:3, 63000 Eyyübiye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Hanehan Restaurant';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '0541 950 41 38'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:00–00:00; Cumartesi08:00–00:00; Pazar08:00–00:00; Pazartesi08:00–00:00; Salı08:00–00:00; Çarşamba08:00–00:00; Perşembe08:00–00:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Sancaktar, Mevlana Cd. no:50, 63040 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Şanlıurfa İrfan Sofrası';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 313 38 00'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma10:00–00:00; Cumartesi10:00–00:00; Pazar10:00–00:00; Pazartesi10:00–00:00; Salı10:00–00:00; Çarşamba10:00–00:00; Perşembe10:00–00:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.2 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Osman Gazi, 400. Sk. No:1 Tepecan Apt, 63300 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Çağdaş Ocakbaşı';
UPDATE places SET opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–00:00; Cumartesi09:00–00:00; Pazar09:00–23:30; Pazartesi09:00–00:00; Salı09:00–00:00; Çarşamba09:00–00:00; Perşembe09:00–00:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Sırrın, Okul Sk. 1 A, 63050 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Şirin Kebap';
UPDATE places SET opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma09:00–23:00; Cumartesi09:00–23:00; Pazar09:00–23:00; Pazartesi09:00–23:00; Salı09:00–23:00; Çarşamba09:00–23:00; Perşembe09:00–23:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Yenişehir, Yenişehir Cd. No:25, 63300 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Kebapçım restorant';
UPDATE places SET rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Veysel Karani, Tandoğan Cd. No:28, 63300 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Eczane Inci';
UPDATE places SET rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4.6 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karşıyaka mahallesi No:2/17, 547. Sk., 63050' ELSE address END, updated_at = NOW() WHERE name ILIKE 'ECZANE KARŞIYAKA';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 315 43 37'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma08:30–18:00; Cumartesi08:30–18:00; PazarKapalı; Pazartesi08:30–18:00; Salı08:30–18:00; Çarşamba08:30–18:00; Perşembe08:30–18:00'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 3.8 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Shell petrol ofisi arkasında Zeliha Öncel Sağlık Ocağı yanında, Karsıyaka 546. Sokak, Mardin yolu No:62/A, 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Sırrın Eczanesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 215 47 31'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 3.7 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'İmambakır Mah, Veteriner Cd. No:10/a, 63200 Haliliye/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Nimetoğlu Eczanesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 312 81 82'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 4 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'İmam Bakır, Orta Doğu Sağlık Mrk. 134 B, 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Karadağ Eczanesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 316 67 77'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 5 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'İmam Bakır, Veteriner Cd. no:11/a, 63040 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Didem Eczanesi';
UPDATE places SET phone = COALESCE(NULLIF(phone,''), '(0414) 313 21 21'), opening_hours = COALESCE(NULLIF(opening_hours,''), 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık'), rating = CASE WHEN (rating IS NULL OR rating = 0) THEN 3.8 ELSE rating END, address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Veysel Karani, mah. 495 . sokak No:4/1 D:400, 63300 Bahçe/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Asya Ecza Deposu A.ş.';
UPDATE places SET address = CASE WHEN (address IS NULL OR address = '' OR address = 'Şanlıurfa') THEN 'Karsıyaka, 63050 Şanlıurfa Merkez/Şanlıurfa' ELSE address END, updated_at = NOW() WHERE name ILIKE 'Şanlıurfa /Altundag Evlere saglık hizmeti';

-- EKLEME: Yeni mekanlar (slug+name dedup)
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Karaköprü Pastanesi - Emniyet Caddesi Şubesi', 'karakopru-pastanesi-emniyet-caddesi-subesi', 'Şanlıurfa''da pastane: Karaköprü Pastanesi - Emniyet Caddesi Şubesi', 'Pastaneler', 'Şıh''ın Yeri Yanı - Taksi Durağı Arkası, Osman Gazi, Emniyet Cd. 404 sk, 63000, Emniyet Cd., 63300 Haliliye/Şanlıurfa', '(0414) 314 14 44', NULL, 4.7, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Pastaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'karakopru-pastanesi-emniyet-caddesi-subesi' OR name ILIKE 'Karaköprü Pastanesi - Emniyet Caddesi Şubesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'ŞANLIURFA PASTANESİ', 'sanliurfa-pastanesi', 'Şanlıurfa''da pastane: ŞANLIURFA PASTANESİ', 'Pastaneler', 'Bahçelievler Mahallesi, Bahçelievler Mh. 113.sok. İlginoğlu ap, 63100 Haliliye/Şanlıurfa', '0543 312 99 04', 'Cuma08:00–22:00; Cumartesi08:00–22:00; Pazar08:00–22:00; Pazartesi08:00–22:00; Salı08:00–22:00; Çarşamba08:00–22:00; Perşembe08:00–22:00', 4.1, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Pastaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sanliurfa-pastanesi' OR name ILIKE 'ŞANLIURFA PASTANESİ');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Karaköprü Pastanesi ve Kahvaltı', 'karakopru-pastanesi-ve-kahvalti', 'Şanlıurfa''da pastane: Karaköprü Pastanesi ve Kahvaltı', 'Pastaneler', 'Çankaya, Gaffar Okan Cd. No:14, 63320 Karaköprü/Şanlıurfa', '0543 515 15 70', NULL, 4.2, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Pastaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'karakopru-pastanesi-ve-kahvalti' OR name ILIKE 'Karaköprü Pastanesi ve Kahvaltı');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'İnci pastanesi', 'inci-pastanesi', 'Şanlıurfa''da pastane: İnci pastanesi', 'Pastaneler', 'Karsıyaka, 546. Sk. No:45, 63040, 63040 Şanlıurfa Merkez/Şanlıurfa', '0537 453 63 34', 'Cuma07:00–00:00; Cumartesi07:00–00:00; Pazar07:30–00:00; Pazartesi07:00–23:45; Salı07:00–23:45; Çarşamba07:00–23:45; Perşembe07:00–23:45', 4.4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Pastaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'inci-pastanesi' OR name ILIKE 'İnci pastanesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Osmanlı Pastanesi', 'osmanli-pastanesi', 'Şanlıurfa''da pastane: Osmanlı Pastanesi', 'Pastaneler', 'No:Karaköprü 35 metre yol üzeri no 2, Narlıkuyu, Eyyüpoğlu caddesi, 63330 Karaköprü/Şanlıurfa', '(0414) 347 00 40', 'Cuma05:00–01:00; Cumartesi05:00–01:00; Pazar05:00–01:00; Pazartesi05:00–01:00; Salı05:00–01:00; Çarşamba05:00–01:00; Perşembe05:00–01:00', 4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Pastaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'osmanli-pastanesi' OR name ILIKE 'Osmanlı Pastanesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'BURÇAK FIRIN PATİSSERİE', 'burcak-firin-patisserie', 'Şanlıurfa''da pastane: BURÇAK FIRIN PATİSSERİE', 'Pastaneler', 'İpekyol, İpekyol Blv. 2332. Sokak, 63050 Haliliye/Şanlıurfa', '0542 232 72 44', 'Cuma06:00–01:00; Cumartesi06:00–01:00; Pazar06:00–01:00; Pazartesi06:00–01:00; Salı06:00–01:00; Çarşamba06:00–01:00; Perşembe06:00–01:00', 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Pastaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'burcak-firin-patisserie' OR name ILIKE 'BURÇAK FIRIN PATİSSERİE');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Şahanoglu Kuyumculuk', 'sahanoglu-kuyumculuk', 'Şanlıurfa''da kuyumcu: Şahanoglu Kuyumculuk', 'Kuyumcular', 'Osman Gazi, Emniyet Cd. 39 A, 63300 Şanlıurfa Merkez/Şanlıurfa', '(0414) 314 08 08', 'Cuma08:30–20:00; Cumartesi08:30–20:00; Pazar08:30–20:00; Pazartesi08:30–20:00; Salı08:30–20:00; Çarşamba08:30–20:00; Perşembe08:30–20:00', 4.3, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Kuyumcular' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sahanoglu-kuyumculuk' OR name ILIKE 'Şahanoglu Kuyumculuk');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'ÇİÇEK KUYUMCULUK', 'cicek-kuyumculuk', 'Şanlıurfa''da kuyumcu: ÇİÇEK KUYUMCULUK', 'Kuyumcular', 'Ulubatlı Mah emniyet caddesi hande apartman altı, no:57/b, 63300 Şanlıurfa Merkez/Şanlıurfa', '0544 744 84 84', 'Cuma08:00–19:00; Cumartesi08:00–19:00; PazarKapalı; Pazartesi08:00–19:00; Salı08:00–19:00; Çarşamba08:00–19:00; Perşembe08:00–19:00', 4.5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Kuyumcular' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'cicek-kuyumculuk' OR name ILIKE 'ÇİÇEK KUYUMCULUK');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Zahter Kuyumculuk', 'zahter-kuyumculuk', 'Şanlıurfa''da kuyumcu: Zahter Kuyumculuk', 'Kuyumcular', 'Sarayönü Caddesi Kapaklı Pasaj Karşısı No:6, 63210 Merkez/Şanlıurfa', '(0414) 216 55 04', 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar09:00–17:00; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık', 4.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Kuyumcular' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'zahter-kuyumculuk' OR name ILIKE 'Zahter Kuyumculuk');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Ekinci Kuyumcu', 'ekinci-kuyumcu', 'Şanlıurfa''da kuyumcu: Ekinci Kuyumcu', 'Kuyumcular', 'Kamberiye, Haşimiye Meydanı/özdiker Kuyumcular Çarşısı D:56/p, 63040 Şanlıurfa Merkez/Şanlıurfa', '(0414) 216 50 20', 'Cuma09:00–19:00; Cumartesi09:00–19:00; PazarKapalı; Pazartesi09:00–19:00; Salı09:00–19:00; Çarşamba09:00–19:00; Perşembe09:00–19:00', 4.7, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Kuyumcular' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'ekinci-kuyumcu' OR name ILIKE 'Ekinci Kuyumcu');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Çankaya Kuyumculuk', 'cankaya-kuyumculuk', 'Şanlıurfa''da kuyumcu: Çankaya Kuyumculuk', 'Kuyumcular', 'Ulubatlı, Emniyet Cd. No:51, 63300 Şanlıurfa Merkez/Şanlıurfa', NULL, 'Cuma09:00–19:00; Cumartesi09:00–19:00; PazarKapalı; Pazartesi09:00–19:00; Salı09:00–19:00; Çarşamba09:00–19:00; Perşembe09:00–19:00', 3.3, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Kuyumcular' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'cankaya-kuyumculuk' OR name ILIKE 'Çankaya Kuyumculuk');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Badıllı Kuyumculuk', 'badilli-kuyumculuk', 'Şanlıurfa''da kuyumcu: Badıllı Kuyumculuk', 'Kuyumcular', 'Camii Kebir Mahallesi, Divanyolu Cd. no:22/B, 63330 Eyyübiye/Şanlıurfa', NULL, 'Cuma08:30–20:30; Cumartesi08:30–20:30; Pazar08:30–20:30; Pazartesi08:30–20:30; Salı08:30–20:30; Çarşamba08:30–20:30; Perşembe08:30–20:30', 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Kuyumcular' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'badilli-kuyumculuk' OR name ILIKE 'Badıllı Kuyumculuk');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Google Haritalar', 'google-haritalar', 'Şanlıurfa''da alışveriş merkezi: Google Haritalar', 'AVM''ler', 'Şanlıurfa', NULL, NULL, NULL, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'AVM''ler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'google-haritalar' OR name ILIKE 'Google Haritalar');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Novada Park Şanlıurfa Alışveriş Merkezi', 'novada-park-sanliurfa-alisveris-merkezi', 'Şanlıurfa''da alışveriş merkezi: Novada Park Şanlıurfa Alışveriş Merkezi', 'AVM''ler', 'Bamyasuyu, 18 Mart Çanakkale Cd No:2, 63040 Haliliye/Şanlıurfa', '(0414) 502 12 12', 'Cuma10:00–22:00; Cumartesi10:00–22:00; Pazar10:00–22:00; Pazartesi10:00–22:00; Salı10:00–22:00; Çarşamba10:00–22:00; Perşembe10:00–22:00', 3.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'AVM''ler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'novada-park-sanliurfa-alisveris-merkezi' OR name ILIKE 'Novada Park Şanlıurfa Alışveriş Merkezi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Piazza Şanlıurfa', 'piazza-sanliurfa', 'Şanlıurfa''da alışveriş merkezi: Piazza Şanlıurfa', 'AVM''ler', 'Karakoyunlu, 11 Nisan Fuar Cd. No:42, 63200 Şanlıurfa Merkez/Şanlıurfa', '444 8 780', 'Cuma10:00–22:00; Cumartesi10:00–22:00; Pazar10:00–22:00; Pazartesi10:00–22:00; Salı10:00–22:00; Çarşamba10:00–22:00; Perşembe10:00–22:00', 4.2, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'AVM''ler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'piazza-sanliurfa' OR name ILIKE 'Piazza Şanlıurfa');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'URFA METRO', 'urfa-metro', 'Şanlıurfa''da alışveriş merkezi: URFA METRO', 'AVM''ler', 'No:, Sırrın, Recep Tayyip Erdoğan Blv. No:238, 63050 Şanlıurfa Merkez/Şanlıurfa', '0542 235 89 02', 'Cuma07:00–23:00; Cumartesi07:00–23:00; Pazar07:00–23:00; Pazartesi07:00–23:00; Salı07:00–23:00; Çarşamba07:00–23:00; Perşembe07:00–23:00', 4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'AVM''ler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'urfa-metro' OR name ILIKE 'URFA METRO');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Avm Merkezi', 'avm-merkezi', 'Şanlıurfa''da alışveriş merkezi: Avm Merkezi', 'AVM''ler', 'Karsıyaka, 505. Sk. No:22, 63040 Şanlıurfa Merkez/Şanlıurfa', NULL, NULL, 4.4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'AVM''ler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'avm-merkezi' OR name ILIKE 'Avm Merkezi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Mozaik Avm', 'mozaik-avm', 'Şanlıurfa''da alışveriş merkezi: Mozaik Avm', 'AVM''ler', 'Esentepe, 303. Sk. No:10, 63330 Şanlıurfa Merkez/Şanlıurfa', NULL, 'Cuma09:00–23:00; Cumartesi09:00–23:00; Pazar10:00–23:00; Pazartesi09:00–23:00; Salı09:00–23:00; Çarşamba09:00–23:00; Perşembe09:00–23:00', 4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'AVM''ler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'mozaik-avm' OR name ILIKE 'Mozaik Avm');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Deniz Doğal Dondurma', 'deniz-dogal-dondurma', 'Şanlıurfa''da dondurma salonu: Deniz Doğal Dondurma', 'Dondurmacılar', 'Karsıyaka, 593 Sokak No:3/a, 63040 Haliliye/Şanlıurfa', '0553 054 70 75', 'Cuma09:00–02:00; Cumartesi09:00–02:00; Pazar09:00–02:00; Pazartesi09:00–02:00; Salı09:00–02:00; Çarşamba09:00–02:00; Perşembe09:00–02:00', 3.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Dondurmacılar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'deniz-dogal-dondurma' OR name ILIKE 'Deniz Doğal Dondurma');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Miroğlu Kadayıf & Dondurma | Haliliye', 'miroglu-kadayif-dondurma-haliliye', 'Şanlıurfa''da dondurma salonu: Miroğlu Kadayıf & Dondurma | Haliliye', 'Dondurmacılar', 'Ulubatlı Bulvar Apartmanı, Ulubatlı, Emniyet Cd. 17B, 63300 Haliliye/Şanlıurfa', '(0414) 314 14 14', NULL, 4.3, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Dondurmacılar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'miroglu-kadayif-dondurma-haliliye' OR name ILIKE 'Miroğlu Kadayıf & Dondurma | Haliliye');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Dondurmacı Zeki', 'dondurmaci-zeki', 'Şanlıurfa''da dondurma salonu: Dondurmacı Zeki', 'Dondurmacılar', 'Yusufpaşa, Sarayönü Cd. 42 B, 63210 Merkez/Şanlıurfa', '(0414) 215 22 13', 'Cuma08:00–02:00; Cumartesi08:00–02:00; Pazar08:00–02:00; Pazartesi08:00–02:00; Salı08:00–02:00; Çarşamba08:00–02:00; Perşembe08:00–02:00', 3.8, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Dondurmacılar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'dondurmaci-zeki' OR name ILIKE 'Dondurmacı Zeki');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Görkem2 Künefe & Dondurma', 'gorkem2-kunefe-dondurma', 'Şanlıurfa''da dondurma salonu: Görkem2 Künefe & Dondurma', 'Dondurmacılar', 'Sırrın, 644. Sk. No:19 D:a, 63050 Haliliye/Şanlıurfa', '0545 413 01 67', 'Cuma12:00–00:00; Cumartesi12:00–00:00; Pazar12:00–00:00; Pazartesi12:00–00:00; Salı12:00–00:00; Çarşamba12:00–02:00; Perşembe12:00–00:00', 4.7, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Dondurmacılar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'gorkem2-kunefe-dondurma' OR name ILIKE 'Görkem2 Künefe & Dondurma');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'HOCAOĞLU KÜNEFE & DONDURMA ( HALİLİYE / MERKEZ )', 'hocaoglu-kunefe-dondurma-haliliye-merkez', 'Şanlıurfa''da dondurma salonu: HOCAOĞLU KÜNEFE & DONDURMA ( HALİLİYE / MERKEZ )', 'Dondurmacılar', 'Şair Nabi, 187. Sk., 63040 Haliliye/Şanlıurfa', '0535 430 03 63', 'Cuma12:30–00:00; Cumartesi12:30–00:00; PazarKapalı; Pazartesi12:30–00:00; Salı12:30–00:00; Çarşamba12:30–00:00; Perşembe12:30–00:00', 4.8, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Dondurmacılar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'hocaoglu-kunefe-dondurma-haliliye-merkez' OR name ILIKE 'HOCAOĞLU KÜNEFE & DONDURMA ( HALİLİYE / MERKEZ )');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Misdon Dondurma Şanlıurfa Fabrika Satış Noktası', 'misdon-dondurma-sanliurfa-fabrika-satis-noktasi', 'Şanlıurfa''da dondurma salonu: Misdon Dondurma Şanlıurfa Fabrika Satış Noktası', 'Dondurmacılar', 'Mehmet Akif Ersoy Caddesi Eyüp, Hamidiye, Sultan Apt No:17/B, 63050 Haliliye/Şanlıurfa', '0544 822 82 82', 'Cuma10:00–23:30; Cumartesi10:00–23:30; Pazar10:00–23:30; Pazartesi10:00–23:30; Salı10:00–23:30; Çarşamba10:00–23:30; Perşembe10:00–23:30', 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Dondurmacılar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'misdon-dondurma-sanliurfa-fabrika-satis-noktasi' OR name ILIKE 'Misdon Dondurma Şanlıurfa Fabrika Satış Noktası');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Karşıyaka Cami', 'karsiyaka-cami', 'Şanlıurfa''da cami: Karşıyaka Cami', 'Camiler', 'Karsıyaka, 505. Sk. No:86, 63050 Şanlıurfa Merkez/Şanlıurfa', NULL, NULL, 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Camiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'karsiyaka-cami' OR name ILIKE 'Karşıyaka Cami');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Abdurrahman Yavuz Taziye Evi ve Camii', 'abdurrahman-yavuz-taziye-evi-ve-camii', 'Şanlıurfa''da cami: Abdurrahman Yavuz Taziye Evi ve Camii', 'Camiler', 'Karsıyaka, 531. Sk. No:82, 63050 Şanlıurfa Merkez/Şanlıurfa', NULL, NULL, 4.5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Camiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'abdurrahman-yavuz-taziye-evi-ve-camii' OR name ILIKE 'Abdurrahman Yavuz Taziye Evi ve Camii');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'H. Hasari Yıldız Cami', 'h-hasari-yildiz-cami', 'Şanlıurfa''da cami: H. Hasari Yıldız Cami', 'Camiler', 'Karsıyaka, 576. Sk. No:12, 63040 Şanlıurfa Merkez/Şanlıurfa', NULL, NULL, 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Camiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'h-hasari-yildiz-cami' OR name ILIKE 'H. Hasari Yıldız Cami');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Sırrın Cami', 'sirrin-cami', 'Şanlıurfa''da cami: Sırrın Cami', 'Camiler', 'Sırrın, Recep Tayyip Erdoğan Blv. No:200, 63050 Şanlıurfa Merkez/Şanlıurfa', NULL, NULL, 4.4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Camiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sirrin-cami' OR name ILIKE 'Sırrın Cami');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Hasan Yıldız Cami', 'hasan-yildiz-cami', 'Şanlıurfa''da cami: Hasan Yıldız Cami', 'Camiler', 'Karsıyaka, 573. Sk. No:5, 63040 Şanlıurfa Merkez/Şanlıurfa', NULL, NULL, NULL, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Camiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'hasan-yildiz-cami' OR name ILIKE 'Hasan Yıldız Cami');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Gül Muhammed Cami', 'gul-muhammed-cami', 'Şanlıurfa''da cami: Gül Muhammed Cami', 'Camiler', 'İmam Bakır, 667. Sk. No:7, 63040 Şanlıurfa Merkez/Şanlıurfa', NULL, NULL, 4.7, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Camiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'gul-muhammed-cami' OR name ILIKE 'Gül Muhammed Cami');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Hilton Garden Inn Şanlıurfa', 'hilton-garden-inn-sanliurfa', 'Şanlıurfa''da otel: Hilton Garden Inn Şanlıurfa', 'Oteller', 'Karakoyunlu, 11 Nisan Fuar Cd. No:54, 63100 Eyyübiye/Şanlıurfa', '(0414) 318 50 00', NULL, 4.1, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Oteller' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'hilton-garden-inn-sanliurfa' OR name ILIKE 'Hilton Garden Inn Şanlıurfa');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Aslan Konukevi Otel & Sıra Gecesi', 'aslan-konukevi-otel-sira-gecesi', 'Şanlıurfa''da otel: Aslan Konukevi Otel & Sıra Gecesi', 'Oteller', 'Aslan Konukevi, Camikebir, 1351. Sk. No:10, 63210 Eyyübiye/Şanlıurfa', '0542 397 57 89', NULL, 4.5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Oteller' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'aslan-konukevi-otel-sira-gecesi' OR name ILIKE 'Aslan Konukevi Otel & Sıra Gecesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Beyzade Konak Otel', 'beyzade-konak-otel', 'Şanlıurfa''da otel: Beyzade Konak Otel', 'Oteller', 'sarayönü caddesi, Yusufpaşa, 916. Sk. No:14, 63210 Eyyübiye/Şanlıurfa', '(0414) 216 35 35', NULL, 4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Oteller' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'beyzade-konak-otel' OR name ILIKE 'Beyzade Konak Otel');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Hilton Garden Inn Şanlıurfa', 'hilton-garden-inn-sanliurfa', 'Şanlıurfa''da otel: Hilton Garden Inn Şanlıurfa', 'Oteller', 'Karakoyunlu, 11 Nisan Fuar Cd. No:54, 63100 Eyyübiye/Şanlıurfa', '(0414) 318 50 00', NULL, 4.1, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Oteller' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'hilton-garden-inn-sanliurfa' OR name ILIKE 'Hilton Garden Inn Şanlıurfa');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Şark Çırağan Konağı', 'sark-ciragan-konagi', 'Şanlıurfa''da otel: Şark Çırağan Konağı', 'Oteller', 'Kadıoğlu, 926. Sk. No:23, 63210 Eyyübiye/Şanlıurfa', '0545 503 37 64', NULL, 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Oteller' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sark-ciragan-konagi' OR name ILIKE 'Şark Çırağan Konağı');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Karagül Otel', 'karagul-otel', 'Şanlıurfa''da otel: Karagül Otel', 'Oteller', 'Yusufpaşa, 926. Sk. No:27, 63210 Eyyübiye/Şanlıurfa', '0533 788 12 69', NULL, 4.5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Oteller' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'karagul-otel' OR name ILIKE 'Karagül Otel');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Şanlıurfa Arkeoloji Müzesi', 'sanliurfa-arkeoloji-muzesi', 'Şanlıurfa''da müze: Şanlıurfa Arkeoloji Müzesi', 'Müzeler', 'Haleplibahçe, 2372. Sk. No:74/1, 63200 Eyyübiye/Şanlıurfa', '(0414) 313 15 88', 'Cuma08:30–17:00; Cumartesi08:30–17:00; Pazar08:30–17:00; Pazartesi08:30–17:00; Salı08:30–17:00; Çarşamba08:30–17:00; Perşembe08:30–17:00', 4.8, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Müzeler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sanliurfa-arkeoloji-muzesi' OR name ILIKE 'Şanlıurfa Arkeoloji Müzesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Haleplibahçe Mozaik Müzesi', 'haleplibahce-mozaik-muzesi', 'Şanlıurfa''da müze: Haleplibahçe Mozaik Müzesi', 'Müzeler', 'Haleplibahçe, 2372. Sk. 74/1, 63200 Merkez/Şanlıurfa', '(0414) 313 15 88', 'Cuma08:30–17:30; Cumartesi08:30–17:30; Pazar08:30–17:30; Pazartesi08:30–17:30; Salı08:30–17:30; Çarşamba08:30–17:30; Perşembe08:30–17:30', 4.7, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Müzeler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'haleplibahce-mozaik-muzesi' OR name ILIKE 'Haleplibahçe Mozaik Müzesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Göbeklitepe', 'gobeklitepe', 'Şanlıurfa''da müze: Göbeklitepe', 'Müzeler', 'Örencik, 63290 Haliliye/Şanlıurfa', '(0414) 313 15 88', 'Cuma08:30–17:00; Cumartesi08:30–17:00; Pazar08:30–17:00; Pazartesi08:30–17:00; Salı08:30–17:00; Çarşamba08:30–17:00; Perşembe08:30–17:00', 4.7, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Müzeler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'gobeklitepe' OR name ILIKE 'Göbeklitepe');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Mutfak Müzesi', 'mutfak-muzesi', 'Şanlıurfa''da müze: Mutfak Müzesi', 'Müzeler', 'Camikebir, 1349. Sk. No:3, 63210 Şanlıurfa Merkez/Şanlıurfa', NULL, 'Cuma09:00–17:00; Cumartesi09:00–17:00; Pazar09:00–17:00; PazartesiKapalı; Salı09:00–17:00; Çarşamba09:00–17:00; Perşembe09:00–17:00', 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Müzeler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'mutfak-muzesi' OR name ILIKE 'Mutfak Müzesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Urfa Kent Müzesi', 'urfa-kent-muzesi', 'Şanlıurfa''da müze: Urfa Kent Müzesi', 'Müzeler', 'Beykapusu, 970. Sk. No:43, 63210 Eyyübiye/Şanlıurfa', NULL, 'Cuma08:00–17:00; Cumartesi09:00–17:00; PazarKapalı; PazartesiKapalı; Salı08:00–17:00; Çarşamba08:00–17:00; Perşembe08:00–17:00', 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Müzeler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'urfa-kent-muzesi' OR name ILIKE 'Urfa Kent Müzesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Müslüm Gürses Müzesi', 'muslum-gurses-muzesi', 'Şanlıurfa''da müze: Müslüm Gürses Müzesi', 'Müzeler', 'Doğukent Mahallesi, 105. Cadde, Yaşam Park İçi, 63320 Karaköprü/Şanlıurfa', NULL, 'Cuma09:30–12:0013:00–18:00; Cumartesi09:30–12:0013:00–18:00; Pazar09:30–12:0013:00–18:00; PazartesiKapalı; Salı09:30–12:0013:00–18:00; Çarşamba09:30–12:0013:00–18:00; Perşembe09:30–12:0013:00–18:00', 4.3, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Müzeler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'muslum-gurses-muzesi' OR name ILIKE 'Müslüm Gürses Müzesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Optimax Optik', 'optimax-optik', 'Şanlıurfa''da optik gözlük mağazası: Optimax Optik', 'Optikçiler', 'Şanmed Hastanesi Karşısı, Ulubatlı, Yunus Emre Cd. Baraj Apt. Altı No:83/D, 63300 Haliliye/Şanlıurfa', '0539 879 00 00', 'Cuma09:00–20:00; Cumartesi09:00–20:00; PazarKapalı; Pazartesi09:00–20:00; Salı09:00–20:00; Çarşamba09:00–20:00; Perşembe09:00–20:00', 4.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Optikçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'optimax-optik' OR name ILIKE 'Optimax Optik');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Elif Optik 1', 'elif-optik-1', 'Şanlıurfa''da optik gözlük mağazası: Elif Optik 1', 'Optikçiler', 'şanmed hastanesi yani, Ertuğrul Gazi, Yunus Emre Cd., 63040 Şanlıurfa Merkez/Şanlıurfa', '0544 314 04 15', NULL, 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Optikçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'elif-optik-1' OR name ILIKE 'Elif Optik 1');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Emin OPTİK', 'emin-optik', 'Şanlıurfa''da optik gözlük mağazası: Emin OPTİK', 'Optikçiler', 'Ulubatlı, Yunus Emre Cd. 83/B, 63300 Şanlıurfa Merkez/Şanlıurfa', '0530 406 00 57', 'Cuma08:30–19:30; Cumartesi08:00–19:30; PazarKapalı; Pazartesi08:00–19:30; Salı08:00–19:30; Çarşamba08:00–19:30; Perşembe08:30–19:30', 4.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Optikçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'emin-optik' OR name ILIKE 'Emin OPTİK');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Lüks Optik', 'luks-optik', 'Şanlıurfa''da optik gözlük mağazası: Lüks Optik', 'Optikçiler', 'Karakoyunlu, 11 Nisan Fuar Cd. Piazza alışveriş merkezi 42 / 134 Kat:2, 63200 Eyyübiye/Şanlıurfa', '0506 909 30 63', 'Cuma10:00–22:00; Cumartesi10:00–22:00; Pazar10:00–22:00; Pazartesi10:00–22:00; Salı10:00–22:00; Çarşamba10:00–22:00; Perşembe10:00–22:00', 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Optikçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'luks-optik' OR name ILIKE 'Lüks Optik');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Enver Optik', 'enver-optik', 'Şanlıurfa''da optik gözlük mağazası: Enver Optik', 'Optikçiler', 'Prof. Abdülkadir Karahan Caddesi, 63100', '(0414) 314 50 05', 'Cuma08:30–19:00; Cumartesi08:30–19:00; PazarKapalı; Pazartesi08:30–19:00; Salı08:30–19:00; Çarşamba08:30–19:00; Perşembe08:30–19:00', 4.8, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Optikçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'enver-optik' OR name ILIKE 'Enver Optik');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Atasun Optik', 'atasun-optik', 'Şanlıurfa''da optik gözlük mağazası: Atasun Optik', 'Optikçiler', 'Bamyasuyu, 18 Mart Çanakkale Cd Novada Park AVM No:2/M, 63040 Haliliye/Şanlıurfa', '(0414) 214 25 63', 'Cuma10:00–22:00; Cumartesi10:00–22:00; Pazar10:00–22:00; Pazartesi10:00–22:00; Salı10:00–22:00; Çarşamba10:00–22:00; Perşembe10:00–22:00', 4.3, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Optikçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'atasun-optik' OR name ILIKE 'Atasun Optik');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Mabel çiçek şanlıurfa', 'mabel-cicek-sanliurfa', 'Şanlıurfa''da çiçekçi: Mabel çiçek şanlıurfa', 'Çiçekçiler', 'Platin Yonca Apartmanı, Narlıkuyu, Mehmet Hafız Blv. No:78/12, 63300 Karaköprü/Şanlıurfa', '0501 155 73 36', 'Cuma09:00–21:30; Cumartesi09:00–21:30; Pazar09:00–21:30; Pazartesi09:00–21:30; Salı09:00–21:30; Çarşamba09:00–21:30; Perşembe09:00–21:30', 4.8, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Çiçekçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'mabel-cicek-sanliurfa' OR name ILIKE 'Mabel çiçek şanlıurfa');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Florya Çiçekçilik & Çikolata', 'florya-cicekcilik-cikolata', 'Şanlıurfa''da çiçekçi: Florya Çiçekçilik & Çikolata', 'Çiçekçiler', 'Karşıyaka Mahallesi, DEDEOSMAN, AVNİ CADDESİ 6BA, 63050 Haliliye/Şanlıurfa', '0544 501 72 47', NULL, 4.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Çiçekçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'florya-cicekcilik-cikolata' OR name ILIKE 'Florya Çiçekçilik & Çikolata');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Buket çiçekçilik', 'buket-cicekcilik', 'Şanlıurfa''da çiçekçi: Buket çiçekçilik', 'Çiçekçiler', 'Karsıyaka, 590. Sk. No:63000, 63050 Haliliye/Şanlıurfa', '0544 773 49 43', NULL, 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Çiçekçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'buket-cicekcilik' OR name ILIKE 'Buket çiçekçilik');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Urfa Karşıyaka Çiçekçi', 'urfa-karsiyaka-cicekci', 'Şanlıurfa''da çiçekçi: Urfa Karşıyaka Çiçekçi', 'Çiçekçiler', 'Lalezar Evleri Bitişiği, Karsıyaka, DEDEOSMAN AVNİ CADDESİ 6BA, 63050 Haliliye/Şanlıurfa', '0544 501 72 47', NULL, 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Çiçekçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'urfa-karsiyaka-cicekci' OR name ILIKE 'Urfa Karşıyaka Çiçekçi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Çiçek Lab & Çikolata', 'cicek-lab-cikolata', 'Şanlıurfa''da çiçekçi: Çiçek Lab & Çikolata', 'Çiçekçiler', 'Kanalboyu kafeler yanı Bi hava Cafe arası Winner Cafe yanı, Sırrın, Karsıyaka, 590. Sk. Erahanoğlu apt. Altı No:20/A, 63040 Haliliye/Şanlıurfa', '0501 179 93 63', 'Cuma08:00–23:00; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi08:00–23:00; Salı08:00–23:00; Çarşamba08:00–23:00; Perşembe08:00–23:00', 4.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Çiçekçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'cicek-lab-cikolata' OR name ILIKE 'Çiçek Lab & Çikolata');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Urfa Çiçekçi Mustafa', 'urfa-cicekci-mustafa', 'Şanlıurfa''da çiçekçi: Urfa Çiçekçi Mustafa', 'Çiçekçiler', 'Yenişehir, Emniyet Cd. Polayitkan Apt Altı 66/D, 63040 Haliliye/Şanlıurfa', '0544 314 84 84', 'Cuma08:00–22:00; Cumartesi08:00–22:00; Pazar08:00–21:00; Pazartesi08:00–22:00; Salı08:00–22:00; Çarşamba08:00–22:00; Perşembe08:00–22:00', 4.5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Çiçekçiler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'urfa-cicekci-mustafa' OR name ILIKE 'Urfa Çiçekçi Mustafa');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'ŞANLIURFA GEZİ DURAĞI', 'sanliurfa-gezi-duragi', 'Şanlıurfa''da gezilecek yer: ŞANLIURFA GEZİ DURAĞI', 'Gezilecek Yerler', 'Karşıyaka Mahallesi, Karşıyaka Sokak. NO:33A TİC:75, 63300 Haliliye/Şanlıurfa', '0552 920 18 08', NULL, 4.3, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Gezilecek Yerler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sanliurfa-gezi-duragi' OR name ILIKE 'ŞANLIURFA GEZİ DURAĞI');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Halfeti Rum Kale Uygun Fiyata Tekne Turu Mehmet Kaptan', 'halfeti-rum-kale-uygun-fiyata-tekne-turu-mehmet-kaptan', 'Şanlıurfa''da gezilecek yer: Halfeti Rum Kale Uygun Fiyata Tekne Turu Mehmet Kaptan', 'Gezilecek Yerler', 'Şimaliye, 63950 Halfeti/Şanlıurfa', '0538 709 70 78', NULL, 4.5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Gezilecek Yerler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'halfeti-rum-kale-uygun-fiyata-tekne-turu-mehmet-kaptan' OR name ILIKE 'Halfeti Rum Kale Uygun Fiyata Tekne Turu Mehmet Kaptan');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Rumkale Halfeti Teknede Evlilik Teklifi Organizasyon', 'rumkale-halfeti-teknede-evlilik-teklifi-organizasyon', 'Şanlıurfa''da gezilecek yer: Rumkale Halfeti Teknede Evlilik Teklifi Organizasyon', 'Gezilecek Yerler', 'Rüştiye, 63950 Halfeti/Şanlıurfa', '0538 814 17 94', 'Cuma07:00–22:00; Cumartesi07:00–22:00; Pazar07:00–22:00; Pazartesi07:00–22:00; Salı07:00–22:00; Çarşamba07:00–22:00; Perşembe07:00–22:00', 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Gezilecek Yerler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'rumkale-halfeti-teknede-evlilik-teklifi-organizasyon' OR name ILIKE 'Rumkale Halfeti Teknede Evlilik Teklifi Organizasyon');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Halfeti Rumkale Tekne Turları', 'halfeti-rumkale-tekne-turlari', 'Şanlıurfa''da gezilecek yer: Halfeti Rumkale Tekne Turları', 'Gezilecek Yerler', 'Şimaliye, Atatürk Cd., 63950, 63000 Halfeti/Şanlıurfa', '0531 775 92 90', 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık', 4.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Gezilecek Yerler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'halfeti-rumkale-tekne-turlari' OR name ILIKE 'Halfeti Rumkale Tekne Turları');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'HALFETİ KOÇAK TEKNE TURU', 'halfeti-kocak-tekne-turu', 'Şanlıurfa''da gezilecek yer: HALFETİ KOÇAK TEKNE TURU', 'Gezilecek Yerler', 'Eski, Rüştiye, 63950 Halfeti/Şanlıurfa', '0535 698 22 59', 'Cuma08:30–18:00; Cumartesi07:00–19:00; Pazar07:00–19:00; Pazartesi08:30–18:00; Salı08:30–18:00; Çarşamba08:30–18:00; Perşembe08:30–18:00', 4.4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Gezilecek Yerler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'halfeti-kocak-tekne-turu' OR name ILIKE 'HALFETİ KOÇAK TEKNE TURU');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Halfeti Siyah Gül Tekne Turları', 'halfeti-siyah-gul-tekne-turlari', 'Şanlıurfa''da gezilecek yer: Halfeti Siyah Gül Tekne Turları', 'Gezilecek Yerler', 'Rüştiye, 63950 Halfeti/Şanlıurfa', '0541 258 22 79', 'Cuma07:00–23:00; Cumartesi07:00–23:00; Pazar07:00–23:00; Pazartesi07:00–23:00; Salı07:00–23:00; Çarşamba07:00–23:00; Perşembe07:00–23:00', 4.1, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Gezilecek Yerler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'halfeti-siyah-gul-tekne-turlari' OR name ILIKE 'Halfeti Siyah Gül Tekne Turları');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Mitratur Şanlıurfa', 'mitratur-sanliurfa', 'Şanlıurfa''da tur acentesi: Mitratur Şanlıurfa', 'Tur Acenteleri', 'Bamyasuyu Mahallesi Cumhuriyet Cad, 128. Sk. No:1/54, 63040 Haliliye/Şanlıurfa', '0544 590 63 63', NULL, 4.4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Tur Acenteleri' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'mitratur-sanliurfa' OR name ILIKE 'Mitratur Şanlıurfa');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Afat Turizm', 'afat-turizm', 'Şanlıurfa''da tur acentesi: Afat Turizm', 'Tur Acenteleri', 'Karsıyaka, 520. Sk. No:6, 63040 Haliliye/Şanlıurfa', NULL, NULL, 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Tur Acenteleri' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'afat-turizm' OR name ILIKE 'Afat Turizm');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Nevali Turizm Seyahat Acentası', 'nevali-turizm-seyahat-acentasi', 'Şanlıurfa''da tur acentesi: Nevali Turizm Seyahat Acentası', 'Tur Acenteleri', 'Kamberiye, Harran Ünv. Cd. 62/2, 63200 Haliliye/Şanlıurfa', '(0414) 216 75 00', 'Cuma09:00–21:00; Cumartesi09:00–21:00; Pazar11:30–17:00; Pazartesi09:00–21:00; Salı09:00–21:00; Çarşamba09:00–21:00; Perşembe09:00–21:00', 4.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Tur Acenteleri' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'nevali-turizm-seyahat-acentasi' OR name ILIKE 'Nevali Turizm Seyahat Acentası');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'BONEGA', 'bonega', 'Şanlıurfa''da tur acentesi: BONEGA', 'Tur Acenteleri', 'Paşabağı, Adalet Cd. Konak Plaza Altı No:17/A, 63300 Haliliye/Şanlıurfa', '0850 533 0510', 'Cuma09:00–19:00; Cumartesi10:00–16:00; PazarKapalı; Pazartesi09:00–19:00; Salı09:00–19:00; Çarşamba09:00–19:00; Perşembe09:00–19:00', 4.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Tur Acenteleri' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'bonega' OR name ILIKE 'BONEGA');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'GÜMÜŞOLUK TURİZM HAC-UMRE', 'gumusoluk-turizm-hac-umre', 'Şanlıurfa''da tur acentesi: GÜMÜŞOLUK TURİZM HAC-UMRE', 'Tur Acenteleri', 'Karsıyaka, 63040 Haliliye/Şanlıurfa', NULL, 'Cuma09:00–17:30; CumartesiKapalı; PazarKapalı; Pazartesi09:00–17:30; Salı09:00–17:30; Çarşamba09:00–17:30; Perşembe09:00–17:30', 4.9, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Tur Acenteleri' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'gumusoluk-turizm-hac-umre' OR name ILIKE 'GÜMÜŞOLUK TURİZM HAC-UMRE');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Seba travel', 'seba-travel', 'Şanlıurfa''da tur acentesi: Seba travel', 'Tur Acenteleri', 'Pınarbaşı, 1214. Sokak,gümrükhan, kat 2 no 56, 63100 Eyyübiye/Şanlıurfa', '0532 403 26 86', 'Cuma09:00–21:00; Cumartesi09:00–21:00; Pazar09:00–21:00; Pazartesi09:00–21:00; Salı09:00–21:00; Çarşamba09:00–21:00; Perşembe09:00–21:00', 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Tur Acenteleri' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'seba-travel' OR name ILIKE 'Seba travel');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Çetiner Turizm Acentesi', 'cetiner-turizm-acentesi', 'Şanlıurfa''da tur acentesi: Çetiner Turizm Acentesi', 'Tur Acenteleri', 'Refahiye, 283. Sk. No:5/B B-3, 63300 Şanlıurfa Merkez/Şanlıurfa', '0541 644 63 03', 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık', 4.5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Tur Acenteleri' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'cetiner-turizm-acentesi' OR name ILIKE 'Çetiner Turizm Acentesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Sultanbey Konuk Evi', 'sultanbey-konuk-evi', 'Şanlıurfa''da restoran: Sultanbey Konuk Evi', 'Restoranlar', 'Camikebir, 1351. Sk. No:3, 63320 Eyyübiye/Şanlıurfa', '0544 784 70 90', 'Cuma08:00–00:00; Cumartesi08:00–00:00; Pazar08:00–00:00; Pazartesi08:00–00:00; Salı08:00–00:00; Çarşamba08:00–00:00; Perşembe08:00–00:00', 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Restoranlar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sultanbey-konuk-evi' OR name ILIKE 'Sultanbey Konuk Evi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'BİRİNCİ CİĞER & KEBAP', 'birinci-ciger-kebap', 'Şanlıurfa''da restoran: BİRİNCİ CİĞER & KEBAP', 'Restoranlar', 'Pınarbaşı, Balıklı Göl Cd, 1211. Sk. No:1/A, 63210 Eyyübiye/Şanlıurfa', '0542 204 30 54', 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık', 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Restoranlar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'birinci-ciger-kebap' OR name ILIKE 'BİRİNCİ CİĞER & KEBAP');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'LİVVA CİĞER KEBAP RESTAURANT ŞANLIURFA', 'livva-ciger-kebap-restaurant-sanliurfa', 'Şanlıurfa''da restoran: LİVVA CİĞER KEBAP RESTAURANT ŞANLIURFA', 'Restoranlar', 'Paşabağı, Mevlana Cd. No:28/B, 63040 Haliliye/Şanlıurfa', '(0414) 312 68 68', 'Cuma08:00–00:00; Cumartesi08:00–00:00; Pazar08:00–00:00; Pazartesi08:00–00:00; Salı08:00–00:00; Çarşamba08:00–00:00; Perşembe08:00–00:00', 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Restoranlar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'livva-ciger-kebap-restaurant-sanliurfa' OR name ILIKE 'LİVVA CİĞER KEBAP RESTAURANT ŞANLIURFA');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Hanehan Restaurant', 'hanehan-restaurant', 'Şanlıurfa''da restoran: Hanehan Restaurant', 'Restoranlar', 'Kurtuluş, Kazancı Bedih Sk. No:3, 63000 Eyyübiye/Şanlıurfa', '0505 414 44 14', 'Cuma12:00–22:00; Cumartesi09:00–22:00; Pazar09:00–22:00; Pazartesi12:00–22:00; Salı12:00–22:00; Çarşamba12:00–22:00; Perşembe12:00–22:00', 4.8, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Restoranlar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'hanehan-restaurant' OR name ILIKE 'Hanehan Restaurant');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Şanlıurfa İrfan Sofrası', 'sanliurfa-irfan-sofrasi', 'Şanlıurfa''da restoran: Şanlıurfa İrfan Sofrası', 'Restoranlar', 'Sancaktar, Mevlana Cd. no:50, 63040 Haliliye/Şanlıurfa', '0541 950 41 38', 'Cuma08:00–00:00; Cumartesi08:00–00:00; Pazar08:00–00:00; Pazartesi08:00–00:00; Salı08:00–00:00; Çarşamba08:00–00:00; Perşembe08:00–00:00', 4.5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Restoranlar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sanliurfa-irfan-sofrasi' OR name ILIKE 'Şanlıurfa İrfan Sofrası');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Çağdaş Ocakbaşı', 'cagdas-ocakbasi', 'Şanlıurfa''da restoran: Çağdaş Ocakbaşı', 'Restoranlar', 'Osman Gazi, 400. Sk. No:1 Tepecan Apt, 63300 Şanlıurfa Merkez/Şanlıurfa', '(0414) 313 38 00', 'Cuma10:00–00:00; Cumartesi10:00–00:00; Pazar10:00–00:00; Pazartesi10:00–00:00; Salı10:00–00:00; Çarşamba10:00–00:00; Perşembe10:00–00:00', 4.2, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Restoranlar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'cagdas-ocakbasi' OR name ILIKE 'Çağdaş Ocakbaşı');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Şirin Kebap', 'sirin-kebap', 'Şanlıurfa''da kebapçı: Şirin Kebap', 'Kebapçılar', 'Sırrın, Okul Sk. 1 A, 63050 Şanlıurfa Merkez/Şanlıurfa', NULL, 'Cuma09:00–00:00; Cumartesi09:00–00:00; Pazar09:00–23:30; Pazartesi09:00–00:00; Salı09:00–00:00; Çarşamba09:00–00:00; Perşembe09:00–00:00', 4.4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Kebapçılar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sirin-kebap' OR name ILIKE 'Şirin Kebap');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Kebapçım restorant', 'kebapcim-restorant', 'Şanlıurfa''da kebapçı: Kebapçım restorant', 'Kebapçılar', 'Yenişehir, Yenişehir Cd. No:25, 63300 Haliliye/Şanlıurfa', NULL, 'Cuma09:00–23:00; Cumartesi09:00–23:00; Pazar09:00–23:00; Pazartesi09:00–23:00; Salı09:00–23:00; Çarşamba09:00–23:00; Perşembe09:00–23:00', 4.4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Kebapçılar' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'kebapcim-restorant' OR name ILIKE 'Kebapçım restorant');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Eczane Inci', 'eczane-inci', 'Şanlıurfa''da eczane: Eczane Inci', 'Eczaneler', 'Veysel Karani, Tandoğan Cd. No:28, 63300 Şanlıurfa Merkez/Şanlıurfa', NULL, NULL, 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Eczaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'eczane-inci' OR name ILIKE 'Eczane Inci');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'ECZANE KARŞIYAKA', 'eczane-karsiyaka', 'Şanlıurfa''da eczane: ECZANE KARŞIYAKA', 'Eczaneler', 'Karşıyaka mahallesi No:2/17, 547. Sk., 63050', NULL, NULL, 4.6, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Eczaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'eczane-karsiyaka' OR name ILIKE 'ECZANE KARŞIYAKA');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Sırrın Eczanesi', 'sirrin-eczanesi', 'Şanlıurfa''da eczane: Sırrın Eczanesi', 'Eczaneler', 'Shell petrol ofisi arkasında Zeliha Öncel Sağlık Ocağı yanında, Karsıyaka 546. Sokak, Mardin yolu No:62/A, 63040 Şanlıurfa Merkez/Şanlıurfa', '(0414) 315 43 37', 'Cuma08:30–18:00; Cumartesi08:30–18:00; PazarKapalı; Pazartesi08:30–18:00; Salı08:30–18:00; Çarşamba08:30–18:00; Perşembe08:30–18:00', 3.8, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Eczaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sirrin-eczanesi' OR name ILIKE 'Sırrın Eczanesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Nimetoğlu Eczanesi', 'nimetoglu-eczanesi', 'Şanlıurfa''da eczane: Nimetoğlu Eczanesi', 'Eczaneler', 'İmambakır Mah, Veteriner Cd. No:10/a, 63200 Haliliye/Şanlıurfa', '(0414) 215 47 31', NULL, 3.7, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Eczaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'nimetoglu-eczanesi' OR name ILIKE 'Nimetoğlu Eczanesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Karadağ Eczanesi', 'karadag-eczanesi', 'Şanlıurfa''da eczane: Karadağ Eczanesi', 'Eczaneler', 'İmam Bakır, Orta Doğu Sağlık Mrk. 134 B, 63040 Şanlıurfa Merkez/Şanlıurfa', '(0414) 312 81 82', NULL, 4, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Eczaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'karadag-eczanesi' OR name ILIKE 'Karadağ Eczanesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Didem Eczanesi', 'didem-eczanesi', 'Şanlıurfa''da eczane: Didem Eczanesi', 'Eczaneler', 'İmam Bakır, Veteriner Cd. no:11/a, 63040 Şanlıurfa Merkez/Şanlıurfa', '(0414) 316 67 77', NULL, 5, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Eczaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'didem-eczanesi' OR name ILIKE 'Didem Eczanesi');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Asya Ecza Deposu A.ş.', 'asya-ecza-deposu-as', 'Şanlıurfa''da eczane: Asya Ecza Deposu A.ş.', 'Eczaneler', 'Veysel Karani, mah. 495 . sokak No:4/1 D:400, 63300 Bahçe/Şanlıurfa', '(0414) 313 21 21', 'Cuma24 saat açık; Cumartesi24 saat açık; Pazar24 saat açık; Pazartesi24 saat açık; Salı24 saat açık; Çarşamba24 saat açık; Perşembe24 saat açık', 3.8, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Eczaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'asya-ecza-deposu-as' OR name ILIKE 'Asya Ecza Deposu A.ş.');
INSERT INTO places (name, slug, description, category, address, phone, opening_hours, rating, status, category_id, district_id, created_at, updated_at)
SELECT 'Şanlıurfa /Altundag Evlere saglık hizmeti', 'sanliurfa-altundag-evlere-saglik-hizmeti', 'Şanlıurfa''da eczane: Şanlıurfa /Altundag Evlere saglık hizmeti', 'Eczaneler', 'Karsıyaka, 63050 Şanlıurfa Merkez/Şanlıurfa', NULL, NULL, NULL, 'active',
  (SELECT id FROM categories WHERE name ILIKE 'Eczaneler' LIMIT 1),
  (SELECT id FROM districts WHERE name = 'Eyyübiye' LIMIT 1),
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM places WHERE slug = 'sanliurfa-altundag-evlere-saglik-hizmeti' OR name ILIKE 'Şanlıurfa /Altundag Evlere saglık hizmeti');