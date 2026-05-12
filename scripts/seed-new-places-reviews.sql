-- 17 Yeni Mekan (Yeme-İçme + Konaklama) için Yorumlar
-- Her mekana 3 yorum → 51 review toplam
-- Subquery pattern: place_id dinamik olarak slug'dan çekiliyor

-- ===== 1. YEME-İÇME YORUMLARI =====

-- 1. meshur-haci-ekber-cigercisi  (5,5,4 → avg=4.7)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='meshur-haci-ekber-cigercisi'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa''ya gelince ilk gittiğim yer', 'Tandır ciğer deyince akla gelen adres. Odun ateşinin verdiği duman aroması başka bir şey. Sabahın erken saatlerinde gelseniz bile kuyruk var, ama hızlı ilerliyor.', 5, 'active', true, true, '2026-10-04', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='meshur-haci-ekber-cigercisi'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', '50 yıllık tarif gerçekten fark yaratıyor', 'Daha önce başka şehirlerde ciğer yedim ama Hacı Ekber''in tarifi bambaşka. İsot ekmeği ile servis ediliyor, yanında soğan. Sade ama kusursuz. Haftanın her günü açık.', 5, 'active', true, true, '2026-10-18', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='meshur-haci-ekber-cigercisi'), '6d913761-4af6-47a4-9877-646451546569', 'Öğleden sonra gitmeyin, tükeniyor', 'Ciğeri çok beğendim; odun ateşinde pişmiş, yumuşak ama yanmamış. Tek uyarım: öğlen 13:00 sonrasında giderseniz günlük stok bitiyor olabilir. Sabah 08:00-12:00 arası en iyi zaman.', 4, 'active', true, true, '2026-11-02', NOW(), NOW());

-- 2. cigerci-mehmet-usta  (5,4,4 → avg=4.3)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='cigerci-mehmet-usta'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Harran yolunda mutlaka durun', 'Harran dönüşünde uğradık ve hiç pişman olmadık. Taze iç yağda pişen ciğer parçaları gerçekten lezzetli. Mekân küçük ve sade ama önemli olan lezzet.', 5, 'active', true, true, '2026-10-30', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='cigerci-mehmet-usta'), '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Sade ama özgün lezzet', 'Şehir merkezindeki kadar köklü değil belki ama Harran güzergâhındaki en iyi ciğer adresi. Porsiyonlar dolu, fiyat makul. Yanındaki isot ekmeği güçlü.', 4, 'active', true, true, '2026-11-14', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='cigerci-mehmet-usta'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Yolculuk molası için ideal', 'Harran''a giderken mola verdik. Ciğer mis gibi, kıvam yerinde. Oturma yeri az, bazıları arabada yiyor. Park etmek kolay. Fiyat performans gayet iyi.', 4, 'active', true, true, '2026-12-05', NOW(), NOW());

-- 3. guneydogu-kebap-salonu  (5,4,4 → avg=4.3)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='guneydogu-kebap-salonu'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Aile yemeği için doğru yer', 'Geniş salonu ve özel oda imkânıyla büyük gruplar için çok uygun. Urfa kebabı standart tutturmuş, ciğer köfte de güzeldi. Çocuklu aile için de rahatlıkla gidilir.', 5, 'active', true, true, '2026-10-10', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='guneydogu-kebap-salonu'), '6d913761-4af6-47a4-9877-646451546569', 'Urfa kebabı iyiydi', 'Menü çeşitli: Urfa kebabı, Adıyaman ciğer köfte, sarma baklava dessert olarak. Kebabın acılığı ayarlanabilir, beni de sorarak hazırladılar. Servis hızlı.', 4, 'active', true, true, '2026-11-22', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='guneydogu-kebap-salonu'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Geniş menü, sıradan mekan', 'Yemekler lezzetli ama dekor biraz eski. Hastane karşısı konumu işlevsel; parkı kolay. Kebap ve pide kombinasyonu 4 kişilik masada makul fiyata geldi.', 4, 'active', true, true, '2026-12-18', NOW(), NOW());

-- 4. urfa-sofrasi-mangal-kebap  (5,4,5 → avg=4.7)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-sofrasi-mangal-kebap'), '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Balıklıgöl''den yürüyerek gidilir', 'Balıklıgöl''ü gezdikten sonra açık havanın mangal kokusuyla yürüyerek bulduk bu yeri. Kaşarlı Urfa kebabı çok iyiydi. Akşam üzeri oturmak keyifli.', 5, 'active', true, true, '2026-10-14', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-sofrasi-mangal-kebap'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Açık mangal kokusu iştah açıyor', 'Yol kenarında geçerken koku çekti. Sebzeli kebap çok güzel, fiyatlar orta segment. Garson ilgili, sipariş almakta gecikmedi. Tekrar gelirim.', 4, 'active', true, true, '2026-11-06', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-sofrasi-mangal-kebap'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Klasik Urfa kebabı burada', 'Klasik çeşitlerde ciddi. Sade Urfa kebabını tercih ettim, ekmeği de tazeydi. Masa sayısı az olduğu için yoğun saatlerde bekleme olabilir. Değer ama.', 5, 'active', true, true, '2026-12-02', NOW(), NOW());

-- 5. balikligol-kahvalti-bahcesi  (5,5,5 → avg=5.0)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='balikligol-kahvalti-bahcesi'), '6d913761-4af6-47a4-9877-646451546569', 'Balıklıgöl manzarasında muhteşem kahvaltı', 'Tam anlamıyla Şanlıurfa kahvaltısı deneyimi. Kaymak, bal, kavut, tandır ekmeği; her şey taze ve lezzetli. Balıklıgöl''deki balıkları masadan izlerken yemek çok farklı.', 5, 'active', true, true, '2026-10-07', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='balikligol-kahvalti-bahcesi'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Kavut ve kaymak kombinasyonu eşsiz', 'Kavutu ilk kez burada tattım ve mükemmeldi. Açık hava bahçesinde oturuyorsunuz, balıklar etrafınızda. Hafta sonu gitmeyi planlayanlar kesinlikle rezervasyon yaptırsın.', 5, 'active', true, true, '2026-10-25', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='balikligol-kahvalti-bahcesi'), '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Hafta sonu kalabalık, rezervasyon şart', 'Çarşamba sabahı gittiğimizde pek kalabalık değildi, rahat oturabilidik. Kahvaltı tabağı zengin ve taze. Fiyatı biraz yüksek ama manzara ve kalite için ödemeye değer.', 5, 'active', true, true, '2026-11-18', NOW(), NOW());

-- 6. harran-ovasi-sabah-sofrasi  (5,5,4 → avg=4.7)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='harran-ovasi-sabah-sofrasi'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Harran yolunda ideal mola noktası', 'Harran''a sabah erken yola çıkmıştık, bu mola noktası göründü. 40 çeşit tabak gerçekten var ve her şey taze. Nar suyu sıkma sahnesini izlemek güzeldi. Tavsiye ederim.', 5, 'active', true, true, '2026-10-20', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='harran-ovasi-sabah-sofrasi'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Teras manzarası çok güzel', 'Harran Ovası''na bakan terasta oturduk. Sabah güneşinde ova manzarasıyla kahvaltı yapmak harikaydı. Mırra ikramı hoş bir jest. Personel çok nazik.', 5, 'active', true, true, '2026-11-09', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='harran-ovasi-sabah-sofrasi'), '6d913761-4af6-47a4-9877-646451546569', 'İyi ama fiyat biraz yüksek', 'Kahvaltı kaliteli ve çeşitli, manzara mükemmel. Ama fiyat şehir merkezindekilerden biraz fazla. Yolda olduğunuz için alternatif az, bu da fiyatı yukarı çekiyor sanırım.', 4, 'active', true, true, '2026-12-14', NOW(), NOW());

-- 7. urfa-tatli-evi-baklava-kadayif  (5,5,4 → avg=4.7)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-tatli-evi-baklava-kadayif'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'En iyi fıstıklı baklava burada', 'Şanlıurfa''daki tatlıcılar arasında en tutarlı kaliteyi burada buldum. Fıstıklı baklava gerçekten ince katlı ve taze. Şerbeti çok şekerli değil, dengeli.', 5, 'active', true, true, '2026-10-09', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-tatli-evi-baklava-kadayif'), '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Sabah sıcak künefe var', 'Bunu söyleyen pek az kişi biliyor: sabah 08:00-10:00 arası taze sıcak künefe servisi yapıyorlar. Peynirli künefe muhteşem. Öğleden sonra giderseniz soğuk olabilir, erken gelin.', 5, 'active', true, true, '2026-11-16', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-tatli-evi-baklava-kadayif'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Hediyelik paketler şık', 'Tatilden dönüşte arkadaşlarıma hediyelik baklava aldım. Ambalaj çok şık, fiyat makul, tazelik garantisi de veriyorlar. Ama şöbiyet dilim tatlılarından daha lezzetliydi bence.', 4, 'active', true, true, '2026-12-22', NOW(), NOW());

-- 8. halfeti-tatlicisi-incir-bal  (5,4,5 → avg=4.7)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='halfeti-tatlicisi-incir-bal'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Siyah incir tatlısı Halfeti''ye özgü', 'Halfeti''nin siyah inciri gerçekten başka bir şey; bu tatlıcı onu doğru kullanıyor. Bal ve kaymak kombinasyonu, Fırat kıyısındaki terasta yemek... anlatmakla bitmez.', 5, 'active', true, true, '2026-10-12', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='halfeti-tatlicisi-incir-bal'), '6d913761-4af6-47a4-9877-646451546569', 'Tekne turu dönüşü vazgeçilmez durak', 'Tekne turundan dönerken hep buraya uğruyoruz. İncir tatlısı hazır olduğunda gerçekten taze ve yumuşak. Teras küçük, yoğun günlerde ayakta yemek gerekebilir.', 4, 'active', true, true, '2026-11-28', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='halfeti-tatlicisi-incir-bal'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Fırat kenarında tatlı molası', 'Nehir kenarındaki açık terasta incir tatlısı yemek; Halfeti deneyiminin özü bu. Baklava da var ama buranın uzmanlığı incir. Kaymak kalitesi çok iyiydi.', 5, 'active', true, true, '2027-01-22', NOW(), NOW());

-- 9. mirra-kahve-evi-balikligol  (5,5,5 → avg=5.0)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='mirra-kahve-evi-balikligol'), '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Mırra''yı ilk kez doğru içtim', 'Urfa''ya birkaç kez geldim ama mırrayı hep yanlış içmişim. Burada nasıl içildiğini anlattılar: fincanın kenarından küçük yudumlar, istenirse ikram tekrarlanır. Ahşap dekor ve Balıklıgöl manzarası mükemmel.', 5, 'active', true, true, '2026-10-17', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='mirra-kahve-evi-balikligol'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa''nın en fotoğrafik kafesi', 'Instagramcıların mutlaka bilmesi gereken yer. Ahşap dekor, camdan Balıklıgöl, altın saat ışığı... Her köşe fotoğraf kare. Mırra lezzetli, Türk kahvesi de kaliteli.', 5, 'active', true, true, '2026-11-01', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='mirra-kahve-evi-balikligol'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Şanlıurfa kültürünü tatmak için', 'Mırra ritüelini yaşamak için en doğru yer. Personel kültür hakkında sohbet ediyor, keyif alıyorsunuz. Fiyat kahve dükkanları içinde biraz yüksek ama deneyim için değer.', 5, 'active', true, true, '2026-12-09', NOW(), NOW());

-- 10. firat-balik-evi-halfeti  (5,5,4 → avg=4.7)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='firat-balik-evi-halfeti'), '6d913761-4af6-47a4-9877-646451546569', 'Fırat''tan günlük taze balık', 'Sabah avlanan balık öğlene geliyor masaya. Sazan tava yaptırdım, çok lezzetliydi; deniz balığının aksine nehir balığı daha hafif bir tat. Nehir kenarındaki masa tercih edin.', 5, 'active', true, true, '2026-10-26', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='firat-balik-evi-halfeti'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Tekne turunu tamamlayan deneyim', 'Halfeti tekne turundan döner dönmez girdim. Levrek ızgara siparişi verdim, 25 dakikada masaya geldi. Nehir kenarı masası boş değildi ama beklemeye değdi.', 5, 'active', true, true, '2026-11-25', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='firat-balik-evi-halfeti'), '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Sazan tava öneriyorum', 'Balık çeşitlerini sordum, sazan ve yayın en taze olanlar dendi. Sazan tava aldım, çıtır dışı, yumuşak içi mükemmeldi. Salata ve ekmek dahil, fiyat gayet uygun.', 4, 'active', true, true, '2026-12-27', NOW(), NOW());

-- 11. urfa-baharat-yoresel-urunler  (5,4,5 → avg=4.7)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-baharat-yoresel-urunler'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'İsot çeşitleri için en doğru adres', 'İsotun kaç çeşidi olduğunu burada öğrendim. Sivri, körpe, siyah isot ayrı ayrı satılıyor; her birinin tadı farklı. Ev için aldıklarım İstanbul''da da muhteşem yemekler çıkardı.', 5, 'active', true, true, '2026-10-03', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-baharat-yoresel-urunler'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Hediyelik ambalajlar kaliteli', 'Arkadaşlarıma hediye olarak isot ve tahin aldım. Ambalaj çok güzeldi, bavulda sağlam geldi. Fiyat kapalı çarşı standartlarında makul.', 4, 'active', true, true, '2026-11-20', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-baharat-yoresel-urunler'), '6d913761-4af6-47a4-9877-646451546569', 'Tahin ve pekmezi buradan alın', 'Üzüm pekmezi başka bir şey; şişede koyu kıvamlı, tatlı ama dengelenmiş. Tahin ile karıştırıldığında mükemmel kahvaltı. Esnaf dürüst, pazarlık yapmadan gerçek fiyat söylüyor.', 5, 'active', true, true, '2026-12-19', NOW(), NOW());

-- 12. tarihi-urfa-katmercisi  (5,5,5 → avg=5.0)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='tarihi-urfa-katmercisi'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Sabah 06:00 için erken kalktım, değdi', 'Konakladığım otelden saat 05:50''de çıktım. 06:00''da kapı açıldı, ilk müşteri oldum. Cevizli katmer fıstıklı kaymakla servis edildi — o güne kadar yediğim en lezzetli sabah yiyeceği.', 5, 'active', true, true, '2026-10-31', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='tarihi-urfa-katmercisi'), '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Cevizli katmer hayatımın en iyisi', 'Özellikle cevizli versiyon çok iyi; iç dolgusunun oranı hamurla mükemmel dengelenmiş. Ustanın 30 yıl sonra da aynı tarifi kullandığını hissediyorsunuz.', 5, 'active', true, true, '2026-11-07', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='tarihi-urfa-katmercisi'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Hamur erken bitiyor, kesinlikle erken gelin', 'Sabah 09:30''da gidince yalnızca 4-5 porsiyon kaldığını söylediler. Şanslıydım, alabildim. Lezzet mükemmeldi ama 3 saat içinde bitiyorsa bu kadar küçük üretim neden sorusu akılda kalıyor.', 5, 'active', true, true, '2026-12-06', NOW(), NOW());

-- ===== 2. KONAKLAMA YORUMLARI =====

-- 13. balikligol-tas-konak  (5,5,5 → avg=5.0)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='balikligol-tas-konak'), '6d913761-4af6-47a4-9877-646451546569', 'Balıklıgöl manzarasından uyandık', 'Oda penceresinden Balıklıgöl''ü ve kutsal balıkları görebiliyorsunuz. Sabah erken saatlerde ışık muhteşem bir manzara sunuyor. Tarihi taş duvarlar dekorasyonu tamamlıyor.', 5, 'active', true, true, '2026-10-22', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='balikligol-tas-konak'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Tarihi mimari ve modern konfor birlikte', 'Restore edilmiş tarihi bir konakta kalmak bambaşka bir deneyim. Duvarlar taş ama içi sıcak. Teras kahvaltısı havuzlu bahçede servis ediliyor — gerçekten güzel.', 5, 'active', true, true, '2026-11-13', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='balikligol-tas-konak'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Şanlıurfa''nın en iyi otel deneyimi', 'Şanlıurfa''da 3 farklı konaklamayı denedim, bu açık ara en iyisi. Oda temizliği, personel ilgisi, kahvaltı kalitesi... Her şey çok iyi. Fiyatı haklı.', 5, 'active', true, true, '2027-01-15', NOW(), NOW());

-- 14. harran-kumbet-konak  (5,5,5 → avg=5.0)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='harran-kumbet-konak'), '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Kümbet evinde uyumak eşsiz deneyim', 'Konik tavan altında uyumak başka bir şey — sabah güneş ışığı kubbeden süzülerek giriyor. Doğal serinlik gerçekten işe yarıyor; dışarıda 40°C iken oda içinde 22-23°C olduğunu termometreyle ölçtüm.', 5, 'active', true, true, '2026-10-08', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='harran-kumbet-konak'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Harran arkeoloji alanına yürüyerek gidebildik', 'Arkeoloji alanına 500m mesafe gerçek; yürüyerek sabah erkenden gidip öğlene döndük. Konaklama mimarisi alanla örtüşüyor; sanki 2000 yıl öncesinde yaşıyorsunuz. Müthiş bir konsept.', 5, 'active', true, true, '2026-11-04', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='harran-kumbet-konak'), '6d913761-4af6-47a4-9877-646451546569', 'Fotoğrafçılar ve araştırmacılar için mükemmel', 'Hem arkeoloji alanına yakınlığı hem de özgün mimarisi açısından bu konaklamanın eşi yok. Süit sayısı az (6), rezervasyonu erken yapın. Sahibi çok bilgili, arkeoloji hakkında uzun sohbetler ettik.', 5, 'active', true, true, '2026-12-01', NOW(), NOW());

-- 15. halfeti-garden-hotel  (5,5,4 → avg=4.7)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='halfeti-garden-hotel'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Fırat manzaralı oda harika', 'Balkondan Fırat''ı izlemek inanılmaz bir deneyim. Özellikle sabah sisi kalkınca manzara büyülüyor. Oda temiz, yataklar konforlu. Tekne iskelesi 3 dakika yürüme mesafesinde.', 5, 'active', true, true, '2026-10-27', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='halfeti-garden-hotel'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Tekne turu organizasyonuna yardım ettiler', 'Tekne turunun saatini ve rezervasyonunu reception ayarladı. Restoranları da önerdiler, hepsine gittik. Otel küçük (28 oda) ama personel çok kişisel ilgileniyor.', 5, 'active', true, true, '2026-11-27', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='halfeti-garden-hotel'), '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Havuz küçük ama yeterli', 'Yazın çok sıcak olduğundan havuz önemli. Küçük ama serinlemek için yeterli. Nehir manzarası olmayan odalar biraz ucuz; eğer gidecekseniz nehir manzaralı odalara bakın, değer.', 4, 'active', true, true, '2026-12-28', NOW(), NOW());

-- 16. gobeklitepe-apart-residence  (4,4,5 → avg=4.3)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='gobeklitepe-apart-residence'), '6d913761-4af6-47a4-9877-646451546569', 'Göbeklitepe ziyaretçileri için doğru tercih', 'Göbeklitepe''ye gitmek için gittiğimde bu apart otel ideal konumdaydı. Gece alışverişim için markete yakın, sabah erkenden arkeoloji alanına çıktım. Büyük otel beklemeyin ama temiz ve işlevsel.', 4, 'active', true, true, '2026-10-16', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='gobeklitepe-apart-residence'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Tam mutfaklı daire uzun konaklama için ideal', 'Arkeoloji konferansı için 5 gün kaldım. Mutfak imkânı olduğu için her gün dışarıda yemek yemek zorunda kalmadım. Alışveriş yapıp kendi yemeklerimi pişirebildim. Çok maliyet tasarrufu yaptım.', 4, 'active', true, true, '2026-11-23', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='gobeklitepe-apart-residence'), '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Fiyat performans çok mantıklı', 'Şehir merkezindeki otellere kıyasla oldukça uygun fiyat. 1+1 daire, temiz, yeterli eşya. Otopark ücretsiz. Göbeklitepe sabah erken ziyareti için konum iyi.', 5, 'active', true, true, '2027-02-10', NOW(), NOW());

-- 17. urfa-ev-pansiyonu  (5,4,5 → avg=4.7)
INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-ev-pansiyonu'), 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Ev hanımının kahvaltısı için tek başına değer', 'Sahibesi her sabah taze tandır ekmeği, ev yapımı reçel ve peynirle kahvaltı hazırlıyor. Hiçbir otelde bu ev sıcaklığını bulamazsınız. Backpacker ve yalnız gezginler için mükemmel.', 5, 'active', true, true, '2026-10-06', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-ev-pansiyonu'), '6d913761-4af6-47a4-9877-646451546569', 'Ev sahibi müthiş rehber', 'Şanlıurfa''yı en iyi nereden gezebilirim diye sordum; ev sahibi kendi yazdığı rota notlarını verdi. O rotayla gezdim ve hiçbir rehber kitabında olmayan mekânlara gittim. Değeri parayla ölçülemez.', 4, 'active', true, true, '2026-11-29', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM places WHERE slug='urfa-ev-pansiyonu'), '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Backpacker cenneti', 'Solo seyahat ediyordum, bütçem sınırlıydı. Burası hem ucuz hem temiz hem de sıcak. Diğer konuklarla sohbet ederek yeni arkadaşlar edindim. Şanlıurfa''ya tekrar geldiğimde mutlaka buraya kalacağım.', 5, 'active', true, true, '2026-12-31', NOW(), NOW());

-- ===== MEKAN PUANLARINI GÜNCELLE =====

-- Yeme-İçme güncellemeleri
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.7 WHERE slug='meshur-haci-ekber-cigercisi';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.3 WHERE slug='cigerci-mehmet-usta';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.3 WHERE slug='guneydogu-kebap-salonu';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.7 WHERE slug='urfa-sofrasi-mangal-kebap';
UPDATE places SET review_count=3, rating_count=3, avg_rating=5.0 WHERE slug='balikligol-kahvalti-bahcesi';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.7 WHERE slug='harran-ovasi-sabah-sofrasi';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.7 WHERE slug='urfa-tatli-evi-baklava-kadayif';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.7 WHERE slug='halfeti-tatlicisi-incir-bal';
UPDATE places SET review_count=3, rating_count=3, avg_rating=5.0 WHERE slug='mirra-kahve-evi-balikligol';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.7 WHERE slug='firat-balik-evi-halfeti';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.7 WHERE slug='urfa-baharat-yoresel-urunler';
UPDATE places SET review_count=3, rating_count=3, avg_rating=5.0 WHERE slug='tarihi-urfa-katmercisi';

-- Konaklama güncellemeleri
UPDATE places SET review_count=3, rating_count=3, avg_rating=5.0 WHERE slug='balikligol-tas-konak';
UPDATE places SET review_count=3, rating_count=3, avg_rating=5.0 WHERE slug='harran-kumbet-konak';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.7 WHERE slug='halfeti-garden-hotel';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.3 WHERE slug='gobeklitepe-apart-residence';
UPDATE places SET review_count=3, rating_count=3, avg_rating=4.7 WHERE slug='urfa-ev-pansiyonu';

-- Sayım doğrulama
SELECT COUNT(*) AS toplam_yorum FROM reviews WHERE status='active';
SELECT COUNT(*) AS toplam_mekan FROM places WHERE status='active';
