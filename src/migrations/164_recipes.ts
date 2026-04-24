import type { Migration } from '../lib/migrations';

export const migration_164_recipes: Migration = {
  version: '164_recipes',
  description: 'Şanlıurfa yöresel yemek tarifleri tablosu ve seed verisi',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        ingredients TEXT[],
        instructions TEXT[],
        cover_image TEXT,
        prep_time INTEGER,
        cook_time INTEGER,
        servings INTEGER,
        difficulty TEXT DEFAULT 'Orta',
        is_spicy BOOLEAN DEFAULT false,
        is_vegetarian BOOLEAN DEFAULT false,
        is_featured BOOLEAN DEFAULT false,
        rating NUMERIC(3,2),
        view_count INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'published',
        meta_title TEXT,
        meta_description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes (slug);
      CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes (status, is_featured);
    `);

    await pool.query(`
      INSERT INTO recipes (slug, name, description, ingredients, instructions, cover_image, prep_time, cook_time, servings, difficulty, is_spicy, is_featured, rating)
      VALUES
        (
          'urfa-kebabi',
          'Urfa Kebabı',
          'Acısız zırh kıyması, isot dengesi ve köz sebze eşliğiyle klasik Şanlıurfa kebabı. Urfa kebabı, yağlı kuzu kıymasının uzun süre yoğrulmasıyla hazırlanır.',
          ARRAY[
            '500g yağlı kuzu kıyması',
            '1 adet soğan (rendelenmiş)',
            '2 diş sarımsak',
            '1 tatlı kaşığı isot (Urfa biberi)',
            '1 tatlı kaşığı tuz',
            '1 tatlı kaşığı kimyon',
            'Pide ekmeği',
            'Közlenmiş domates ve biber'
          ],
          ARRAY[
            'Kıymayı derin bir kaba alın, rendelenmiş soğanı ekleyin.',
            'İsot, sarımsak, tuz ve kimyonu ekleyerek en az 10 dakika yoğurun.',
            'Kıymayı şişlere geçirin, ellerini ıslatarak düzeltin.',
            'Mangal ateşinin üzerinde her iki yüzü de pişirin.',
            'Közlenmiş domates ve biber ile birlikte pide üzerinde servis edin.'
          ],
          '/images/hero/hero-food.webp',
          20, 25, 4, 'Orta', false, true, 4.9
        ),
        (
          'cig-kofte',
          'Şanlıurfa Çiğ Köftesi',
          'İnce bulgur, isot, domates salçası ve uzun yoğurma tekniğiyle Urfa usulü çiğ köfte. Elde yoğurmak lezzet farkı yaratır.',
          ARRAY[
            '2 su bardağı ince bulgur',
            '3 yemek kaşığı domates salçası',
            '1 yemek kaşığı biber salçası',
            '2 yemek kaşığı isot',
            '1 çay kaşığı tuz',
            '1 çay kaşığı kimyon',
            '1 çay kaşığı karabiber',
            '1 adet soğan (rendelenmiş)',
            'Maydanoz, yeşil soğan'
          ],
          ARRAY[
            'Bulguru geniş bir kaba alın, salçaları ve baharatları ekleyin.',
            'Hafif ıslatılmış elle en az 20 dakika yoğurun; bulgur yumuşayıncaya dek devam edin.',
            'Soğan ve maydanozu ekleyerek 5 dakika daha yoğurun.',
            'Yufka yaprağı veya marul ile sararak servis edin.',
            'Nar ekşisi veya limon sıkılarak yenilir.'
          ],
          '/images/blog/sanliurfa-lezzetler-2026.webp',
          60, 0, 6, 'Zor', true, true, 4.8
        ),
        (
          'borani',
          'Borani',
          'Yoğurt, pazı ve nohutla hazırlanan, Şanlıurfa sofralarının dengeli ve besleyici yöresel lezzeti.',
          ARRAY[
            '500g pazı (ıspanak olabilir)',
            '1 su bardağı haşlanmış nohut',
            '2 su bardağı yoğurt',
            '2 diş sarımsak',
            '2 yemek kaşığı tereyağı',
            '1 tatlı kaşığı kuru nane',
            'Tuz'
          ],
          ARRAY[
            'Pazıyı yıkayın, iri doğrayın ve az tuzlu suda haşlayın.',
            'Haşlanan pazıyı süzün, suyunu sıkın.',
            'Yoğurdu ezilmiş sarımsak ve tuzla karıştırın.',
            'Pazı ve nohutları yoğurda ekleyin, karıştırın.',
            'Tereyağını eritip nane ile kızdırın, üzerine gezdirerek servis edin.'
          ],
          '/images/places/cigerci-aziz-usta/food-card.webp',
          15, 20, 4, 'Kolay', false, false, 4.7
        ),
        (
          'lebeni',
          'Lebeni',
          'Yoğurtlu buğday çorbası; özellikle yaz aylarında serin ve doyurucu bir Urfa tarifi. Sindirim için de faydalıdır.',
          ARRAY[
            '1 su bardağı buğday (aşurelik)',
            '1 litre yoğurt',
            '2 yemek kaşığı un',
            '1 yemek kaşığı tereyağı',
            '1 tatlı kaşığı kuru nane',
            'Tuz'
          ],
          ARRAY[
            'Buğdayı bir gece önceden ıslayın, yumuşayana dek haşlayın.',
            'Yoğurdu una yavaş yavaş ekleyerek pürüzsüz karıştırın.',
            'Karışımı hafif ateşte, sürekli karıştırarak koyulaştırın.',
            'Haşlanmış buğdayları ekleyin, tuz ayarlayın.',
            'Kızdırılmış tereyağı ve nane ile üstünü süsleyerek sıcak servis edin.'
          ],
          '/images/hero/hero-food.webp',
          15, 30, 4, 'Kolay', false, false, 4.6
        ),
        (
          'sillik-tatlisi',
          'Şıllık Tatlısı',
          'İnce krep hamuru, ceviz ve şerbetle hazırlanan Şanlıurfa''nın en bilinen geleneksel tatlılarından. Düğünlerde ve bayramlarda yapılır.',
          ARRAY[
            '2 su bardağı un',
            '2 su bardağı su',
            '2 yumurta',
            '1 tatlı kaşığı tuz',
            '1 su bardağı dövülmüş ceviz',
            '2 su bardağı şeker (şerbet için)',
            '1 su bardağı su (şerbet için)',
            '1 tatlı kaşığı limon suyu',
            'Tereyağı (kızartma için)'
          ],
          ARRAY[
            'Un, su, yumurta ve tuzu çırparak akışkan hamur yapın.',
            'Kızdırılmış yağlı tavada ince krep gibi pişirin.',
            'Kreplerin ortasına ceviz koyarak rulo şeklinde sarın.',
            'Şeker ve suyu kaynatarak şerbet hazırlayın, limon ekleyin.',
            'Rulolar tepsiye dizin, şerbet dökün ve 1 saat bekleterek servis edin.'
          ],
          '/images/blog/sanliurfa-lezzetler-2026.webp',
          30, 20, 8, 'Orta', false, true, 4.8
        ),
        (
          'patlican-kebabi',
          'Patlıcan Kebabı',
          'Köz kokusu, yağ dengesi ve kuzu etiyle yapılan Urfa yaz sofralarının güçlü ana yemeği. Közde pişen patlıcan eşsiz lezzet verir.',
          ARRAY[
            '500g kuzu eti (küçük küp)',
            '4 adet orta boy patlıcan',
            '2 adet közlenmiş domates',
            '2 adet közlenmiş biber',
            '3 diş sarımsak',
            '1 tatlı kaşığı isot',
            '1 tatlı kaşığı kimyon',
            'Tuz, zeytinyağı'
          ],
          ARRAY[
            'Etleri küp doğrayın, baharat ve sarımsak ile marine edin (30 dk).',
            'Patlıcanları közde veya fırında yakıp yumuşatın, kabuklarını soyun.',
            'Etleri şişe geçirip mangalda pişirin.',
            'Patlıcanları geniş tabağa serin, üstüne közlenmiş et ve sebzeleri dizin.',
            'Zeytinyağı gezdirip sıcak servis edin.'
          ],
          '/images/hero/hero-food.webp',
          45, 30, 4, 'Orta', false, false, 4.9
        )
      ON CONFLICT (slug) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP TABLE IF EXISTS recipes;`);
  },
};
