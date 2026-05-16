export type ClassifiedCategoryNode = {
  name: string;
  slug: string;
  description?: string;
  children?: ClassifiedCategoryNode[];
};

export const CLASSIFIED_CITY = 'Şanlıurfa';

export const CLASSIFIED_DISTRICTS = [
  'Haliliye',
  'Eyyübiye',
  'Karaköprü',
  'Siverek',
  'Viranşehir',
  'Suruç',
  'Birecik',
  'Akçakale',
  'Ceylanpınar',
  'Hilvan',
  'Bozova',
  'Halfeti',
  'Harran',
] as const;

export const CLASSIFIED_CATEGORY_TREE: ClassifiedCategoryNode[] = [
  {
    name: 'Emlak',
    slug: 'emlak',
    children: [
      { name: 'Konut', slug: 'konut' },
      { name: 'İş Yeri', slug: 'is-yeri' },
      { name: 'Arsa', slug: 'arsa' },
      { name: 'Konut Projeleri', slug: 'konut-projeleri' },
      { name: 'Bina', slug: 'bina' },
      { name: 'Devre Mülk', slug: 'devre-mulk' },
      { name: 'Turistik Tesis', slug: 'turistik-tesis' },
    ],
  },
  {
    name: 'Vasıta',
    slug: 'vasita',
    children: [
      { name: 'Otomobil', slug: 'otomobil' },
      { name: 'Arazi, SUV & Pickup', slug: 'arazi-suv-pickup' },
      {
        name: 'Elektrikli Araçlar',
        slug: 'elektrikli-araclar',
        description: 'Bu kategorideki ilanlar döngüsel ekonomiye katkı sağlıyor.',
      },
      { name: 'Motosiklet', slug: 'motosiklet' },
      { name: 'Minivan & Panelvan', slug: 'minivan-panelvan' },
      { name: 'Ticari Araçlar', slug: 'ticari-araclar' },
      { name: 'Kiralık Araçlar', slug: 'kiralik-araclar' },
      { name: 'Deniz Araçları', slug: 'deniz-araclari' },
      { name: 'Hasarlı Araçlar', slug: 'hasarli-araclar' },
      { name: 'Karavan', slug: 'karavan' },
      { name: 'Klasik Araçlar', slug: 'klasik-araclar' },
      { name: 'Hava Araçları', slug: 'hava-araclari' },
      { name: 'ATV', slug: 'atv' },
      { name: 'UTV', slug: 'utv' },
      { name: 'Engelli Plakalı Araçlar', slug: 'engelli-plakali-araclar' },
    ],
  },
  {
    name: 'Yedek Parça, Aksesuar, Donanım & Tuning',
    slug: 'yedek-parca-aksesuar-donanim-tuning',
    children: [
      { name: 'Otomotiv Ekipmanları', slug: 'otomotiv-ekipmanlari' },
      { name: 'Motosiklet Ekipmanları', slug: 'motosiklet-ekipmanlari' },
      { name: 'Deniz Aracı Ekipmanları', slug: 'deniz-araci-ekipmanlari' },
    ],
  },
  {
    name: 'İkinci El ve Sıfır Alışveriş',
    slug: 'ikinci-el-ve-sifir-alisveris',
    description: 'Bu kategorideki ilanlar döngüsel ekonomiye katkı sağlıyor.',
    children: [
      { name: 'Bilgisayar', slug: 'bilgisayar' },
      { name: 'Cep Telefonu & Aksesuar', slug: 'cep-telefonu-aksesuar' },
      { name: 'Fotoğraf & Kamera', slug: 'fotograf-kamera' },
      { name: 'Ev Dekorasyon', slug: 'ev-dekorasyon' },
      { name: 'Ev Elektroniği', slug: 'ev-elektronigi' },
      { name: 'Elektrikli Ev Aletleri', slug: 'elektrikli-ev-aletleri' },
      { name: 'Giyim & Aksesuar', slug: 'giyim-aksesuar' },
      { name: 'Saat', slug: 'saat' },
      { name: 'Anne & Bebek', slug: 'anne-bebek' },
      { name: 'Kişisel Bakım & Kozmetik', slug: 'kisisel-bakim-kozmetik' },
      { name: 'Hobi & Oyuncak', slug: 'hobi-oyuncak' },
      { name: 'Oyunculara Özel', slug: 'oyunculara-ozel' },
      { name: 'Kitap, Dergi & Film', slug: 'kitap-dergi-film' },
      { name: 'Müzik', slug: 'muzik' },
      { name: 'Spor', slug: 'spor' },
      { name: 'Takı & Mücevher', slug: 'taki-mucevher' },
      { name: 'Koleksiyon', slug: 'koleksiyon' },
      { name: 'Antika', slug: 'antika' },
      { name: 'Bahçe & Yapı Market', slug: 'bahce-yapi-market' },
      { name: 'Teknik Elektronik', slug: 'teknik-elektronik' },
      { name: 'Ofis & Kırtasiye', slug: 'ofis-kirtasiye' },
      { name: 'Yiyecek & İçecek', slug: 'yiyecek-icecek' },
      { name: 'Diğer Her Şey', slug: 'diger-her-sey' },
    ],
  },
];

export type FlatClassifiedCategory = ClassifiedCategoryNode & {
  parentSlug: string | null;
  depth: number;
};

export function flattenClassifiedCategories(
  nodes: ClassifiedCategoryNode[] = CLASSIFIED_CATEGORY_TREE,
  parentSlug: string | null = null,
  depth = 0,
): FlatClassifiedCategory[] {
  return nodes.flatMap((node) => [
    { ...node, parentSlug, depth },
    ...flattenClassifiedCategories(node.children ?? [], node.slug, depth + 1),
  ]);
}

export function isValidClassifiedDistrict(value: string): boolean {
  return CLASSIFIED_DISTRICTS.some((district) => district === value);
}
