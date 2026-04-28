import { pool, query, queryOne } from '../../src/lib/postgres';

type CategorySeed = {
  name: string;
  slug: string;
  parentSlug?: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
};

const ROOT_CATEGORIES: CategorySeed[] = [
  { name: 'Mekanlar', slug: 'mekanlar', icon: 'utensils', color: '#dc2626', sortOrder: 10 },
  { name: 'Yeme İçme', slug: 'yeme-icme', icon: 'chef-hat', color: '#ea580c', sortOrder: 20 },
  { name: 'Gezilecek Yerler', slug: 'gezilecek-yerler', icon: 'map-pinned', color: '#0f766e', sortOrder: 30 },
  { name: 'Etkinlikler', slug: 'etkinlikler', icon: 'calendar-days', color: '#7c3aed', sortOrder: 40 },
  { name: 'Sağlık', slug: 'saglik', icon: 'heart-pulse', color: '#e11d48', sortOrder: 50 },
  { name: 'Eğitim', slug: 'egitim', icon: 'graduation-cap', color: '#2563eb', sortOrder: 60 },
  { name: 'Ulaşım', slug: 'ulasim', icon: 'bus', color: '#0284c7', sortOrder: 70 },
  { name: 'Alışveriş', slug: 'alisveris', icon: 'shopping-bag', color: '#c2410c', sortOrder: 80 },
  { name: 'Hizmetler', slug: 'hizmetler', icon: 'wrench', color: '#475569', sortOrder: 90 },
  { name: 'Emlak', slug: 'emlak', icon: 'building', color: '#059669', sortOrder: 100 },
  { name: 'Konaklama', slug: 'konaklama', icon: 'bed', color: '#854d0e', sortOrder: 110 },
  { name: 'İlçeler', slug: 'ilceler', icon: 'map', color: '#0ea5e9', sortOrder: 120 },
  { name: 'Blog', slug: 'blog', icon: 'book-open', color: '#9333ea', sortOrder: 130 },
];

const CHILD_CATEGORIES: CategorySeed[] = [
  { name: 'Kebapçılar', slug: 'kebapcilar', parentSlug: 'mekanlar', sortOrder: 1 },
  { name: 'Ciğerciler', slug: 'cigerciler', parentSlug: 'mekanlar', sortOrder: 2 },
  { name: 'Lahmacuncular', slug: 'lahmacuncular', parentSlug: 'mekanlar', sortOrder: 3 },
  { name: 'Pideciler', slug: 'pideciler', parentSlug: 'mekanlar', sortOrder: 4 },
  { name: 'Çiğ Köfteciler', slug: 'cig-kofteciler', parentSlug: 'mekanlar', sortOrder: 5 },
  { name: 'Yöresel Yemekler', slug: 'yoresel-yemekler', parentSlug: 'mekanlar', sortOrder: 6 },
  { name: 'Kahvaltı Mekanları', slug: 'kahvalti-mekanlari', parentSlug: 'mekanlar', sortOrder: 7 },
  { name: 'Tatlıcılar', slug: 'tatlicilar', parentSlug: 'mekanlar', sortOrder: 8 },
  { name: 'Fırınlar', slug: 'firinlar', parentSlug: 'mekanlar', sortOrder: 9 },
  { name: 'Pastaneler', slug: 'pastaneler', parentSlug: 'mekanlar', sortOrder: 10 },
  { name: 'Kafeler', slug: 'kafeler', parentSlug: 'mekanlar', sortOrder: 11 },
  { name: 'Çay Bahçeleri', slug: 'cay-bahceleri', parentSlug: 'mekanlar', sortOrder: 12 },
  { name: 'Balık Restoranları', slug: 'balik-restoranlari', parentSlug: 'mekanlar', sortOrder: 13 },

  { name: 'Kahvaltı', slug: 'kahvalti', parentSlug: 'yeme-icme', sortOrder: 1 },
  { name: 'Brunch', slug: 'brunch', parentSlug: 'yeme-icme', sortOrder: 2 },
  { name: 'Gece Açık Mekanlar', slug: 'gece-acik-mekanlar', parentSlug: 'yeme-icme', sortOrder: 3 },
  { name: 'Paket Servis', slug: 'paket-servis', parentSlug: 'yeme-icme', sortOrder: 4 },
  { name: 'Aile Mekanları', slug: 'aile-mekanlari', parentSlug: 'yeme-icme', sortOrder: 5 },
  { name: 'Uygun Fiyatlı Mekanlar', slug: 'uygun-fiyatli-mekanlar', parentSlug: 'yeme-icme', sortOrder: 6 },
  { name: 'Yemek Tarifleri', slug: 'yemek-tarifleri', parentSlug: 'yeme-icme', sortOrder: 7 },

  { name: 'Göbeklitepe', slug: 'gobeklitepe', parentSlug: 'gezilecek-yerler', sortOrder: 1 },
  { name: 'Balıklıgöl', slug: 'balikligol', parentSlug: 'gezilecek-yerler', sortOrder: 2 },
  { name: 'Harran', slug: 'harran', parentSlug: 'gezilecek-yerler', sortOrder: 3 },
  { name: 'Halfeti', slug: 'halfeti', parentSlug: 'gezilecek-yerler', sortOrder: 4 },
  { name: 'Urfa Kalesi', slug: 'urfa-kalesi', parentSlug: 'gezilecek-yerler', sortOrder: 5 },
  { name: 'Ayna Çarşı', slug: 'ayna-carsi', parentSlug: 'gezilecek-yerler', sortOrder: 6 },
  { name: 'Kapalı Çarşı', slug: 'kapali-carsi', parentSlug: 'gezilecek-yerler', sortOrder: 7 },
  { name: 'Müzeler', slug: 'muzeler', parentSlug: 'gezilecek-yerler', sortOrder: 8 },
  { name: 'Tarihi Yerler', slug: 'tarihi-yerler', parentSlug: 'gezilecek-yerler', sortOrder: 9 },
  { name: 'Mesire Alanları', slug: 'mesire-alanlari', parentSlug: 'gezilecek-yerler', sortOrder: 10 },
  { name: 'Piknik Alanları', slug: 'piknik-alanlari', parentSlug: 'gezilecek-yerler', sortOrder: 11 },

  { name: 'Konserler', slug: 'konserler', parentSlug: 'etkinlikler', sortOrder: 1 },
  { name: 'Sıra Geceleri', slug: 'sira-geceleri', parentSlug: 'etkinlikler', sortOrder: 2 },
  { name: 'Festivaller', slug: 'festivaller', parentSlug: 'etkinlikler', sortOrder: 3 },
  { name: 'Sergiler', slug: 'sergiler', parentSlug: 'etkinlikler', sortOrder: 4 },
  { name: 'Belediye Etkinlikleri', slug: 'belediye-etkinlikleri', parentSlug: 'etkinlikler', sortOrder: 5 },
  { name: 'Bugün', slug: 'bugun', parentSlug: 'etkinlikler', sortOrder: 6 },
  { name: 'Hafta Sonu', slug: 'hafta-sonu', parentSlug: 'etkinlikler', sortOrder: 7 },

  { name: 'Devlet Hastaneleri', slug: 'devlet-hastaneleri', parentSlug: 'saglik', sortOrder: 1 },
  { name: 'Özel Hastaneler', slug: 'ozel-hastaneler', parentSlug: 'saglik', sortOrder: 2 },
  { name: 'Diş Klinikleri', slug: 'dis-klinikleri', parentSlug: 'saglik', sortOrder: 3 },
  { name: 'Eczaneler', slug: 'eczaneler', parentSlug: 'saglik', sortOrder: 4 },
  { name: 'Nöbetçi Eczaneler', slug: 'nobetci-eczaneler', parentSlug: 'saglik', sortOrder: 5 },
  { name: 'Veterinerler', slug: 'veterinerler', parentSlug: 'saglik', sortOrder: 6 },

  { name: 'Otogar', slug: 'otogar', parentSlug: 'ulasim', sortOrder: 1 },
  { name: 'Havalimanı', slug: 'havalimani', parentSlug: 'ulasim', sortOrder: 2 },
  { name: 'Taksi Durakları', slug: 'taksi-duraklari', parentSlug: 'ulasim', sortOrder: 3 },
  { name: 'Araç Kiralama', slug: 'arac-kiralama', parentSlug: 'ulasim', sortOrder: 4 },
  { name: 'Otobüs Hatları', slug: 'otobus-hatlari', parentSlug: 'ulasim', sortOrder: 5 },
  { name: 'Otobüs Saatleri', slug: 'otobus-saatleri', parentSlug: 'ulasim', sortOrder: 6 },

  { name: 'Anaokulları', slug: 'anaokullari', parentSlug: 'egitim', sortOrder: 1 },
  { name: 'Okullar', slug: 'okullar', parentSlug: 'egitim', sortOrder: 2 },
  { name: 'Üniversiteler', slug: 'universiteler', parentSlug: 'egitim', sortOrder: 3 },
  { name: 'Dershaneler', slug: 'dershaneler', parentSlug: 'egitim', sortOrder: 4 },
  { name: 'Kurslar', slug: 'kurslar', parentSlug: 'egitim', sortOrder: 5 },

  { name: 'AVMler', slug: 'avmler', parentSlug: 'alisveris', sortOrder: 1 },
  { name: 'Hediyelik Eşya', slug: 'hediyelik-esya', parentSlug: 'alisveris', sortOrder: 2 },
  { name: 'Yöresel Ürünler', slug: 'yoresel-urunler', parentSlug: 'alisveris', sortOrder: 3 },
  { name: 'Kuyumcular', slug: 'kuyumcular', parentSlug: 'alisveris', sortOrder: 4 },
  { name: 'Giyim Mağazaları', slug: 'giyim-magazalari', parentSlug: 'alisveris', sortOrder: 5 },

  { name: 'Kuaförler', slug: 'kuaforler', parentSlug: 'hizmetler', sortOrder: 1 },
  { name: 'Berberler', slug: 'berberler', parentSlug: 'hizmetler', sortOrder: 2 },
  { name: 'Temizlik Firmaları', slug: 'temizlik-firmalari', parentSlug: 'hizmetler', sortOrder: 3 },
  { name: 'Nakliyat', slug: 'nakliyat', parentSlug: 'hizmetler', sortOrder: 4 },
  { name: 'Çilingir', slug: 'cilingir', parentSlug: 'hizmetler', sortOrder: 5 },
  { name: 'Elektrikçi', slug: 'elektrikci', parentSlug: 'hizmetler', sortOrder: 6 },
  { name: 'Tesisatçı', slug: 'tesisatci', parentSlug: 'hizmetler', sortOrder: 7 },

  { name: 'Satılık Daire', slug: 'satilik-daire', parentSlug: 'emlak', sortOrder: 1 },
  { name: 'Kiralık Daire', slug: 'kiralik-daire', parentSlug: 'emlak', sortOrder: 2 },
  { name: 'Emlak Ofisleri', slug: 'emlak-ofisleri', parentSlug: 'emlak', sortOrder: 3 },

  { name: 'Oteller', slug: 'oteller', parentSlug: 'konaklama', sortOrder: 1 },
  { name: 'Butik Oteller', slug: 'butik-oteller', parentSlug: 'konaklama', sortOrder: 2 },
  { name: 'Pansiyonlar', slug: 'pansiyonlar', parentSlug: 'konaklama', sortOrder: 3 },
];

async function findCategoryIdBySlug(slug: string): Promise<number | null> {
  const row = await queryOne<{ id: number }>('SELECT id FROM categories WHERE slug = $1', [slug]);
  return row?.id ?? null;
}

async function upsertCategory(seed: CategorySeed) {
  const parentId = seed.parentSlug ? await findCategoryIdBySlug(seed.parentSlug) : null;

  await query(
    `INSERT INTO categories (name, slug, description, icon, color, is_active, sort_order, parent_id, meta_title, meta_description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       icon = EXCLUDED.icon,
       color = EXCLUDED.color,
       is_active = true,
       sort_order = EXCLUDED.sort_order,
       parent_id = EXCLUDED.parent_id,
       meta_title = EXCLUDED.meta_title,
       meta_description = EXCLUDED.meta_description,
       updated_at = NOW()`,
    [
      seed.name,
      seed.slug,
      seed.description || `${seed.name} kategorisinde Şanlıurfa için güncel içerikler.`,
      seed.icon || null,
      seed.color || '#b91c1c',
      seed.sortOrder,
      parentId,
      `Şanlıurfa ${seed.name} Rehberi | Sanliurfa.com`,
      `Şanlıurfa ${seed.name.toLowerCase()} kategorisinde güncel mekanlar, rehberler ve içerikler.`,
    ]
  );
}

async function main() {
  for (const root of ROOT_CATEGORIES) {
    await upsertCategory(root);
  }

  for (const child of CHILD_CATEGORIES) {
    await upsertCategory(child);
  }

  const total = await query<{ count: number }>('SELECT COUNT(*)::int AS count FROM categories');
  const top = await query<{ slug: string; name: string; parent_id: number | null }>(
    'SELECT slug, name, parent_id FROM categories ORDER BY parent_id NULLS FIRST, sort_order, name LIMIT 30'
  );

  console.log('Kategori senkronizasyonu tamamlandı.');
  console.log(`- Toplam kategori: ${total.rows[0]?.count ?? 0}`);
  console.log(`- Kök kategori: ${ROOT_CATEGORIES.length}`);
  console.log(`- Alt kategori: ${CHILD_CATEGORIES.length}`);
  console.log('- İlk 30 kayıt:');
  for (const row of top.rows) {
    console.log(`  • ${row.slug} (${row.parent_id ? 'child' : 'root'})`);
  }
}

main()
  .catch((error) => {
    console.error('Kategori senkronizasyonu başarısız:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
