-- Tarif yorumları seed
INSERT INTO comments (id, target_type, target_id, user_id, content, status, created_at) VALUES
-- Patlıcan Kebabı
(gen_random_uuid(), 'recipe', 'a0222096-0f3b-4a9b-89c9-da4a9ab8335d', '077a30f7-834e-40fb-9fe1-e919a3c90394', 'Bu tarifi geçen hafta denedim, harika oldu! Patlıcanları közlemeden önce tuz baskısı uygularsanız daha güzel bir sonuç çıkıyor.', 'active', NOW() - INTERVAL '15 days'),
(gen_random_uuid(), 'recipe', 'a0222096-0f3b-4a9b-89c9-da4a9ab8335d', '5947a52b-b96b-4c00-b92c-d985a6b9c874', 'Annemin tarifiyle neredeyse birebir aynı. Sarımsağı biraz fazla koymayı seviyoruz biz, ama bu tarif de çok başarılı.', 'active', NOW() - INTERVAL '12 days'),
(gen_random_uuid(), 'recipe', 'a0222096-0f3b-4a9b-89c9-da4a9ab8335d', '6d913761-4af6-47a4-9877-646451546569', 'Urfa mutfağının vazgeçilmezi. Közlenmiş patlıcan farkı büyük yaratıyor, bunu ihmal etmeyin.', 'active', NOW() - INTERVAL '7 days'),
-- Mırra Kahvesi
(gen_random_uuid(), 'recipe', '6c7dd4b3-f89a-4be9-b7e9-ed5ceefba536', '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Mırra ilk içişimde çok acı gelmişti ama alıştıkça bayılıyorsunuz. Bu tarif adımları çok net açıklanmış.', 'active', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), 'recipe', '6c7dd4b3-f89a-4be9-b7e9-ed5ceefba536', 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Gerçek Urfa kahvesini ev ortamında yapmak mümkünmüş demek! Deneyeceğim.', 'active', NOW() - INTERVAL '18 days'),
(gen_random_uuid(), 'recipe', '6c7dd4b3-f89a-4be9-b7e9-ed5ceefba536', '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Şeker olmadan içmek zor oldu başta ama şimdi başka türlü içemiyorum artık. Tarifte bahsedilen havan önemli.', 'active', NOW() - INTERVAL '10 days'),
-- Şanlıurfa İçli Köftesi
(gen_random_uuid(), 'recipe', '706fb77b-627e-49a6-ba53-7535e18d7467', '5a91fbde-f51f-427a-8788-5dbb86d77cb8', 'İçli köfte her zaman biraz zaman ister ama sonuç kesinlikle değer. Hamuru ince açmaya dikkat edin.', 'active', NOW() - INTERVAL '25 days'),
(gen_random_uuid(), 'recipe', '706fb77b-627e-49a6-ba53-7535e18d7467', '077a30f7-834e-40fb-9fe1-e919a3c90394', 'İlk denemede biraz kalın kaldı ama tadı süper. İkinci denemede çok daha iyi oldu.', 'active', NOW() - INTERVAL '22 days'),
(gen_random_uuid(), 'recipe', '706fb77b-627e-49a6-ba53-7535e18d7467', '6d913761-4af6-47a4-9877-646451546569', 'Şanlıurfa usulü diğer şehirlerdekinden gerçekten farklı. Et karışımındaki baharatlar bambaşka bir tat veriyor.', 'active', NOW() - INTERVAL '8 days'),
-- Şanlıurfa Çiğ Köftesi
(gen_random_uuid(), 'recipe', '34e2cf8a-3c15-4082-88ab-19dbd629f16a', '5947a52b-b96b-4c00-b92c-d985a6b9c874', 'Çiğ köfteyi bu kadar basit yapmanın yolunu bulmak harikaydı. Elleri yoğurmak yorucu ama sonuç nefis.', 'active', NOW() - INTERVAL '30 days'),
(gen_random_uuid(), 'recipe', '34e2cf8a-3c15-4082-88ab-19dbd629f16a', '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Limon miktarını tarifte yazandan biraz daha fazla koydum, çok daha iyi oldu.', 'active', NOW() - INTERVAL '27 days'),
(gen_random_uuid(), 'recipe', '34e2cf8a-3c15-4082-88ab-19dbd629f16a', 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Kırmızı biberlerin tazeliği çok önemli. Taze kırmızı biber ile yapınca rengi ve tadı çok daha güzel oluyor.', 'active', NOW() - INTERVAL '14 days'),
-- Mumbar Dolması
(gen_random_uuid(), 'recipe', 'afa4f404-2e7b-4a00-a6fb-262d1a83da63', '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Mumbar dolması yapmayı hiç denemedim ama bu tarifi okuyunca cesaretlendim. Fırsat buldukça deneyeceğim.', 'active', NOW() - INTERVAL '19 days'),
(gen_random_uuid(), 'recipe', 'afa4f404-2e7b-4a00-a6fb-262d1a83da63', '5a91fbde-f51f-427a-8788-5dbb86d77cb8', 'Ustalardan öğrendiğim bir püf noktası: iç harcı çok sıkıştırmayın, pişerken şişiyor.', 'active', NOW() - INTERVAL '11 days'),
-- Şanlıurfa Tiriti
(gen_random_uuid(), 'recipe', '4a5cc3d0-8b55-4b56-a342-1637b9bdba73', '5947a52b-b96b-4c00-b92c-d985a6b9c874', 'Tirit yemeklerini çok seviyorum. Bu versiyon özellikle baharatlı et suyu ile muhteşem bir tat veriyor.', 'active', NOW() - INTERVAL '16 days'),
(gen_random_uuid(), 'recipe', '4a5cc3d0-8b55-4b56-a342-1637b9bdba73', '6d913761-4af6-47a4-9877-646451546569', 'Sabah kahvaltısı için de ideal. Bu tarif güzel bir başlangıç noktası, harika.', 'active', NOW() - INTERVAL '9 days'),
-- Şanlıurfa Sini Köftesi
(gen_random_uuid(), 'recipe', '0eeab11a-c122-4222-95fc-b1c1931f9171', '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Sini köfte ilk kez yaptım ve çok başarılı oldu. Tabağa dizme kısmı biraz sabır istiyor ama sonuç göz alıcı.', 'active', NOW() - INTERVAL '24 days'),
(gen_random_uuid(), 'recipe', '0eeab11a-c122-4222-95fc-b1c1931f9171', 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Bu tarif standart köfteden çok farklı bir sunum sunuyor. Misafirlere yapınca çok beğenildi.', 'active', NOW() - INTERVAL '17 days'),
-- Bıttım Çorbası
(gen_random_uuid(), 'recipe', '8670c890-15e0-4da5-b9df-21f4040b828e', '5a91fbde-f51f-427a-8788-5dbb86d77cb8', 'Bıttım çorbası Şanlıurfa''da içtiğimde aşık olmuştum. Tarifte bahsedilen ıslatma süresi çok önemli, ihmal etmeyin.', 'active', NOW() - INTERVAL '28 days'),
(gen_random_uuid(), 'recipe', '8670c890-15e0-4da5-b9df-21f4040b828e', '077a30f7-834e-40fb-9fe1-e919a3c90394', 'Çam fıstığının bu çorbadaki rolü inanılmaz. İlk yudumda bambaşka bir lezzet katıyor.', 'active', NOW() - INTERVAL '21 days'),
(gen_random_uuid(), 'recipe', '8670c890-15e0-4da5-b9df-21f4040b828e', '5947a52b-b96b-4c00-b92c-d985a6b9c874', 'Soğuk kış günleri için mükemmel. Hazırlaması uzun sürüyor ama değiyor.', 'active', NOW() - INTERVAL '13 days'),
-- Kaburga Dolması
(gen_random_uuid(), 'recipe', 'f2ab10aa-2b91-42f9-82dd-e0cb1ca0ceba', '6d913761-4af6-47a4-9877-646451546569', 'Kaburga dolması düğün sofrasının vazgeçilmezi. Bu tarifi yaptım, ailem çok beğendi.', 'active', NOW() - INTERVAL '23 days'),
(gen_random_uuid(), 'recipe', 'f2ab10aa-2b91-42f9-82dd-e0cb1ca0ceba', '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Pilavın kaburgayla birlikte pişmesi hem pratik hem de lezzetli. Tarifi okuyunca basit göründü, gerçekten de o kadar.', 'active', NOW() - INTERVAL '6 days'),
-- Kuru Köfte
(gen_random_uuid(), 'recipe', '57a9163c-bd27-4aec-bebc-bea4458a896f', '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Kuru köfte hem pratik hem lezzetli. Kahvaltıya da süper gidiyor, misafirlerde hep alkış topluyor.', 'active', NOW() - INTERVAL '18 days'),
(gen_random_uuid(), 'recipe', '57a9163c-bd27-4aec-bebc-bea4458a896f', '5a91fbde-f51f-427a-8788-5dbb86d77cb8', 'Soğuk yendiğinde tadı değişiyor daha da güzel oluyor. Pikniğe de götürebilirsiniz.', 'active', NOW() - INTERVAL '11 days'),
(gen_random_uuid(), 'recipe', '57a9163c-bd27-4aec-bebc-bea4458a896f', 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Baharatları tam ölçüsünde kullandım ve gerçekten fark yarattı. Kesinlikle tavsiye ederim.', 'active', NOW() - INTERVAL '5 days');

-- Blog yorumları seed
INSERT INTO comments (id, target_type, target_id, user_id, content, status, created_at) VALUES
-- Piknik Yerleri Rehberi
(gen_random_uuid(), 'blog', '727ef1c7-c9f7-45cd-8636-9f5369e6fac8', '077a30f7-834e-40fb-9fe1-e919a3c90394', 'Geçen hafta Şanlıurfa''da piknik yaptık, bu rehber çok işe yaradı! Özellikle Balıklıgöl çevresi muhteşemdi.', 'active', NOW() - INTERVAL '14 days'),
(gen_random_uuid(), 'blog', '727ef1c7-c9f7-45cd-8636-9f5369e6fac8', '6d913761-4af6-47a4-9877-646451546569', 'Birecik Barajı kıyısını da listeye eklemek güzel olurdu. Çok güzel bir piknik alanı orası.', 'active', NOW() - INTERVAL '10 days'),
(gen_random_uuid(), 'blog', '727ef1c7-c9f7-45cd-8636-9f5369e6fac8', '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Fotoğrafçılık için de harika yerler bunlar. Gün batımında Halfeti civarı ayrı bir güzel.', 'active', NOW() - INTERVAL '7 days'),
-- Urfa Usulü Katmer
(gen_random_uuid(), 'blog', 'd4b8fe3e-9304-4451-bed5-ef90c3f64988', '5947a52b-b96b-4c00-b92c-d985a6b9c874', 'Katmeri Şanlıurfa''da yedim ilk kez, unutamıyorum o tadı. Bu yazıyı okuyunca tarifi denemek istiyorum.', 'active', NOW() - INTERVAL '22 days'),
(gen_random_uuid(), 'blog', 'd4b8fe3e-9304-4451-bed5-ef90c3f64988', '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Harika yazı. Urfa tatlıları genelde az bilinir, bu tür içerikler çok farkındalık yaratıyor.', 'active', NOW() - INTERVAL '18 days'),
-- 3 Günlük Gezi Planı
(gen_random_uuid(), 'blog', '6dae54d1-5700-42b7-86cb-6f7a885efd4e', '5a91fbde-f51f-427a-8788-5dbb86d77cb8', '3 günlük planı biraz sıkıştırılmış buldum ama genel mantık çok doğru. Göbeklitepe mutlaka sabah erken ziyaret edilmeli.', 'active', NOW() - INTERVAL '26 days'),
(gen_random_uuid(), 'blog', '6dae54d1-5700-42b7-86cb-6f7a885efd4e', '077a30f7-834e-40fb-9fe1-e919a3c90394', 'Bu rotayı takip ettim, harika bir gezi oldu. Özellikle Harran''da şapelere mutlaka uğrayın.', 'active', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), 'blog', '6dae54d1-5700-42b7-86cb-6f7a885efd4e', 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Yazıda bahsedilen Atatürk Barajı için tekne turunu da eklemek güzel olurdu.', 'active', NOW() - INTERVAL '8 days'),
-- Yerel Pazarlar Rehberi
(gen_random_uuid(), 'blog', '15876676-cc2b-4e14-92d6-7b36f1d1f8e5', '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Cuma pazarını daha önce bilmiyordum. Gidip görmek istiyorum, yerel ürünler için harika bir fırsat.', 'active', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), 'blog', '15876676-cc2b-4e14-92d6-7b36f1d1f8e5', '5947a52b-b96b-4c00-b92c-d985a6b9c874', 'Şanlıurfa''ya gidince pazar ziyareti şart. Bu yazı çok kapsamlı bilgi vermiş.', 'active', NOW() - INTERVAL '12 days'),
(gen_random_uuid(), 'blog', '15876676-cc2b-4e14-92d6-7b36f1d1f8e5', '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Baharatçılar sokağını mutlaka ekleyin bir dahaki yazınıza. Çok özgün bir deneyim yaşıyorsunuz orada.', 'active', NOW() - INTERVAL '6 days'),
-- Dini Ziyaret Noktaları
(gen_random_uuid(), 'blog', 'd47c86a9-dae4-4fb6-9155-b02e01386c15', '077a30f7-834e-40fb-9fe1-e919a3c90394', 'Dergah ve Balıklıgöl''ü ziyaret etmiştim. Buradaki maneviyat başka bir boyutta. Yazı çok güzel aktarmış.', 'active', NOW() - INTERVAL '29 days'),
(gen_random_uuid(), 'blog', 'd47c86a9-dae4-4fb6-9155-b02e01386c15', '6d913761-4af6-47a4-9877-646451546569', 'Şanlıurfa''nın dini mirası gerçekten zengin. Hz. İbrahim''in izleri hissediliyor her köşede.', 'active', NOW() - INTERVAL '21 days'),
(gen_random_uuid(), 'blog', 'd47c86a9-dae4-4fb6-9155-b02e01386c15', '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Eyyüb Peygamber makamını da mutlaka ekleyin sonraki içeriklere. Ziyaret edilmesi gereken bir yer.', 'active', NOW() - INTERVAL '9 days'),
-- Romantik Mekanlar
(gen_random_uuid(), 'blog', 'eaa292a8-13b3-48c0-8ce1-749bfdbca269', '5947a52b-b96b-4c00-b92c-d985a6b9c874', 'Balıklıgöl''de gün batımı kesinlikle en romantik anlardan biri. Sevgilimle gittik, harika bir deneyimdi.', 'active', NOW() - INTERVAL '16 days'),
(gen_random_uuid(), 'blog', 'eaa292a8-13b3-48c0-8ce1-749bfdbca269', '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Halfeti tekne turu çiftler için mükemmel. Nehir kıyısında akşam yemeği de olsa süper olur.', 'active', NOW() - INTERVAL '13 days'),
-- Hilvan Kaplıcaları
(gen_random_uuid(), 'blog', 'd947253c-4099-4821-88a8-5d70c6d36a1b', '5a91fbde-f51f-427a-8788-5dbb86d77cb8', 'Hilvan kaplıcalarına gittik geçen ay, gerçekten şifalı. Yazıda anlatılan termal havuz muhteşemdi.', 'active', NOW() - INTERVAL '24 days'),
(gen_random_uuid(), 'blog', 'd947253c-4099-4821-88a8-5d70c6d36a1b', '077a30f7-834e-40fb-9fe1-e919a3c90394', 'Hafta sonu kaçamağı için ideal. Bu rehber çok kapsamlı, teşekkürler.', 'active', NOW() - INTERVAL '19 days'),
-- En İyi Kebapçılar
(gen_random_uuid(), 'blog', 'a13f238c-12cc-477c-9669-e89e2e251b23', '6d913761-4af6-47a4-9877-646451546569', 'Ciğer ve kebap mekânları listesine hayran kaldım. Önceki gelişimde yanlış yerlere gitmişim galiba.', 'active', NOW() - INTERVAL '27 days'),
(gen_random_uuid(), 'blog', 'a13f238c-12cc-477c-9669-e89e2e251b23', '2ba2cc08-a0a9-480b-91df-5091707d4854', 'Özellikle Kapalıçarşı çevresi kebapçılar için vazgeçilmez. Bu rehber çok doğru.', 'active', NOW() - INTERVAL '23 days'),
(gen_random_uuid(), 'blog', 'a13f238c-12cc-477c-9669-e89e2e251b23', '5947a52b-b96b-4c00-b92c-d985a6b9c874', 'Şanlıurfa''da ciğer kebabı tadılmadan gidilmez. Listedeki ilk iki mekânı denedim, süperdi.', 'active', NOW() - INTERVAL '15 days'),
-- Halfeti Rumkale
(gen_random_uuid(), 'blog', '6fbbf0aa-69f9-482e-b807-8d7484110fd7', '12673736-1996-4fe3-b9e5-6b73b5da1a43', 'Rumkale''yi tekneyle görmek başka bir deneyim. Sular altında kalan tarihin üzerinde gezmek tüyler ürpertiyor.', 'active', NOW() - INTERVAL '31 days'),
(gen_random_uuid(), 'blog', '6fbbf0aa-69f9-482e-b807-8d7484110fd7', 'b3e82a97-c812-42a2-a02b-aaffe159fa5b', 'Halfeti''yi ziyaret ettim ama Rumkale''yi kaçırmışım. Bir dahaki gelişimde mutlaka göreceğim.', 'active', NOW() - INTERVAL '25 days'),
(gen_random_uuid(), 'blog', '6fbbf0aa-69f9-482e-b807-8d7484110fd7', '5a91fbde-f51f-427a-8788-5dbb86d77cb8', 'Bu tarihi yapıyı koruma altına almanın önemi çok güzel anlatılmış. Çok değerli bir miras.', 'active', NOW() - INTERVAL '11 days');
