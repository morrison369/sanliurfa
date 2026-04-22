export type CuratedFood = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  gallery: string[];
  history: string;
  ingredients: string[];
  preparation: string;
  isSpicy: boolean;
  isVegetarian: boolean;
  difficulty: string;
  prepTime: string;
  servingSize: string;
  calories: string;
  rating: number;
  reviewCount: number;
  whereToEat: Array<{ id: string; slug: string; name: string; rating: number; address: string }>;
  tips: string[];
};

export const curatedFoods: CuratedFood[] = [
  {
    id: 'urfa-kebabi',
    slug: 'urfa-kebabi',
    name: 'Urfa Kebabı',
    description:
      "Baharatlı kıymanın odun ateşinde pişirilmesiyle hazırlanan Urfa kebabı, Şanlıurfa'nın en bilinen gastronomi simgelerinden biridir.",
    image: '/images/foods/urfa-kebabi.jpg',
    gallery: ['/images/foods/urfa-kebabi-1.jpg', '/images/foods/urfa-kebabi-2.jpg', '/images/foods/urfa-kebabi-3.jpg'],
    history:
      "Urfa kebabı, Şanlıurfa'nın et kültürü, isot kullanımı ve ocakbaşı geleneğiyle gelişmiş yöresel bir lezzettir.",
    ingredients: ['Kuzu kıyma', 'Kuyruk yağı', 'Tuz', 'Karabiber', 'İsot', 'Lavaş', 'Közlenmiş biber'],
    preparation:
      '1. Kıyma ve baharatlar yoğrulur.\n2. Harç şişe dengeli şekilde yayılır.\n3. Köz ateşinde çevrilerek pişirilir.\n4. Lavaş, közlenmiş biber ve salatayla servis edilir.',
    isSpicy: false,
    isVegetarian: false,
    difficulty: 'Zor',
    prepTime: '45 dk + dinlendirme',
    servingSize: '4 kişilik',
    calories: '450 kcal/porsiyon',
    rating: 4.9,
    reviewCount: 2156,
    whereToEat: [
      { id: 'urfa-kebabi', slug: 'urfa-kebabi', name: 'Urfa Kebabı Deneyimi', rating: 4.7, address: 'Şanlıurfa Merkez' },
    ],
    tips: ['Kıyma fazla kuru olmamalıdır.', 'Köz ateşi dengeli olmalıdır.', 'Servis sıcak yapılmalıdır.'],
  },
  {
    id: 'cig-kofte',
    slug: 'cig-kofte',
    name: 'Çiğ Köfte',
    description:
      'İsot, bulgur ve yöresel baharatlarla hazırlanan çiğ köfte, Şanlıurfa sofra kültürünün en güçlü lezzetlerinden biridir.',
    image: '/images/foods/cig-kofte.jpg',
    gallery: ['/images/foods/cig-kofte.jpg'],
    history:
      'Çiğ köfte, Şanlıurfa’da yoğurma tekniği, isot dengesi ve sunum geleneğiyle kuşaktan kuşağa aktarılan bir lezzettir.',
    ingredients: ['İnce bulgur', 'İsot', 'Domates salçası', 'Biber salçası', 'Soğan', 'Sarımsak', 'Maydanoz'],
    preparation:
      '1. Bulgur ve baharatlar karıştırılır.\n2. Salça ve isot eklenerek uzun süre yoğrulur.\n3. Kıvam alınca yeşillik eklenir.\n4. Marul ve limonla servis edilir.',
    isSpicy: true,
    isVegetarian: true,
    difficulty: 'Çok Zor',
    prepTime: '2 saat',
    servingSize: '6 kişilik',
    calories: '220 kcal/porsiyon',
    rating: 4.8,
    reviewCount: 1680,
    whereToEat: [
      { id: 'cig-kofte', slug: 'cig-kofte', name: 'Şanlıurfa Çiğ Köfte', rating: 4.6, address: 'Şanlıurfa Merkez' },
    ],
    tips: ['Bulgur kontrollü ıslatılmalıdır.', 'İsot kalitesi lezzeti doğrudan etkiler.', 'Yoğurma süresi kısa tutulmamalıdır.'],
  },
  {
    id: 'isot',
    slug: 'isot',
    name: 'Urfa İsotu',
    description:
      'Güneşte kurutulan ve yağla harmanlanan Urfa isotu, Şanlıurfa mutfağının karakterini belirleyen temel baharattır.',
    image: '/images/foods/isot.jpg',
    gallery: ['/images/foods/isot.jpg'],
    history:
      'İsot, Şanlıurfa’da biberin kurutulması, dinlendirilmesi ve yöresel yöntemlerle işlenmesiyle oluşan güçlü bir mutfak mirasıdır.',
    ingredients: ['Urfa biberi', 'Zeytinyağı veya bitkisel yağ', 'Tuz'],
    preparation:
      '1. Biberler ayıklanır ve kurutulur.\n2. Güneşte renk alması beklenir.\n3. Öğütülür ve yağla harmanlanır.\n4. Serin ve kapalı yerde saklanır.',
    isSpicy: true,
    isVegetarian: true,
    difficulty: 'Orta',
    prepTime: '1 hafta',
    servingSize: 'Baharat',
    calories: '30 kcal/kaşık',
    rating: 4.9,
    reviewCount: 920,
    whereToEat: [
      { id: 'isot', slug: 'isot', name: 'İsot ve Baharat Rotası', rating: 4.5, address: 'Tarihi Çarşılar Bölgesi' },
    ],
    tips: ['Nemden uzak saklanmalıdır.', 'Koyu renk kalite işaretlerinden biridir.', 'Aşırı kavrulmuş kokudan kaçınılmalıdır.'],
  },
  {
    id: 'sillik-tatlisi',
    slug: 'sillik-tatlisi',
    name: 'Şıllık Tatlısı',
    description:
      'İnce hamur, ceviz ve şerbetle hazırlanan şıllık tatlısı, Şanlıurfa’nın en sevilen yöresel tatlılarındandır.',
    image: '/images/foods/sillik-tatlisi.jpg',
    gallery: ['/images/foods/sillik-tatlisi.jpg'],
    history:
      'Şıllık tatlısı, Şanlıurfa ev mutfağında özel günlerde ve misafir sofralarında yer bulan geleneksel bir tatlıdır.',
    ingredients: ['Un', 'Süt', 'Yumurta', 'Ceviz', 'Tereyağı', 'Şeker', 'Su'],
    preparation:
      '1. İnce hamur hazırlanır.\n2. Tavada krep gibi pişirilir.\n3. Cevizle sarılır.\n4. Şerbet ve tereyağıyla servis edilir.',
    isSpicy: false,
    isVegetarian: true,
    difficulty: 'Orta',
    prepTime: '1 saat',
    servingSize: '6 kişilik',
    calories: '320 kcal/porsiyon',
    rating: 4.7,
    reviewCount: 640,
    whereToEat: [
      { id: 'sillik-tatlisi', slug: 'sillik-tatlisi', name: 'Şıllık Tatlısı', rating: 4.4, address: 'Şanlıurfa Merkez' },
    ],
    tips: ['Hamur çok kalın olmamalıdır.', 'Şerbet ılık kullanılmalıdır.', 'Ceviz taze olmalıdır.'],
  },
];

export function getCuratedFoods(limit?: number): CuratedFood[] {
  return typeof limit === 'number' ? curatedFoods.slice(0, limit) : curatedFoods;
}

export function getCuratedFoodBySlug(slug: string | undefined): CuratedFood | null {
  if (!slug) return null;
  return curatedFoods.find((food) => food.slug === slug) || null;
}
