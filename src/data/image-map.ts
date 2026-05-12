export const IMAGE_MAP = {
  hero: {
    home: { src: '/images/blog/urfa-tarihi.webp', tag: 'city' },
    mekanlar: { src: '/images/blog/sanliurfa-lezzetler-2026.webp', tag: 'food' },
    gezilecek: { src: '/images/blog/tarihi-yerler-rehberi.jpg', tag: 'history' },
    isletme: { src: '/images/blog/sanliurfa-lezzetler-2026.webp', tag: 'food' },
  },
  pools: {
    historical: [
      { src: '/images/tarihi-yerler/harran-kumbet-evleri.jpg', tag: 'history' },
      { src: '/images/blog/gobeklitepe.jpg', tag: 'history' },
      { src: '/images/blog/balikligol.jpg', tag: 'history' },
      { src: '/images/blog/halfeti.jpg', tag: 'history' },
      { src: '/images/blog/urfa-kalesi.jpg', tag: 'history' },
    ],
    food: [
      { src: '/images/hero/hero-food.webp', tag: 'food' },
      { src: '/images/blog/sanliurfa-lezzetler-2026.webp', tag: 'food' },
      { src: '/images/places/cigerci-aziz-usta/food-card.webp', tag: 'food' },
      { src: '/images/places/cigerci-aziz-usta/food.webp', tag: 'food' },
      { src: '/images/foods/default.jpg', tag: 'food' },
    ],
  },
  homepage: {
    places: {
      balikligol: '/images/places/balikligol/main-card.webp',
      gobeklitepe: '/images/places/gobeklitepe/hero-card.webp',
      'cigerci-aziz-usta': '/images/places/cigerci-aziz-usta/food-card.webp',
      'hanehan-otel': '/images/places/hanehan-otel/exterior-card.webp',
    },
    historical: {
      gobeklitepe: '/images/blog/gobeklitepe.jpg',
      balikligol: '/images/blog/balikligol.jpg',
      harran: '/images/blog/harran.jpg',
      halfeti: '/images/blog/halfeti.jpg',
    },
    recipes: {
      'urfa-kebabi': '/images/foods/homepage/urfa-kebabi-card.png',
      'sillik-tatlisi': '/images/foods/homepage/sillik-tatlisi-card.png',
      'cig-kofte': '/images/foods/homepage/cig-kofte-card.png',
      cigkofte: '/images/foods/homepage/cig-kofte-card.png',
      'patlican-kebabi': '/images/foods/homepage/patlican-kebabi-card.png',
      borani: '/images/foods/homepage/borani-card.png',
      lebeni: '/images/foods/homepage/lebeni-card.png',
    },
    blog: {
      gobeklitepe: '/images/blog/gobeklitepe.jpg',
      balikligol: '/images/blog/balikligol.jpg',
      harran: '/images/blog/harran.jpg',
      halfeti: '/images/blog/halfeti.jpg',
      'sanliurfa-en-iyi-kebapcilar': '/images/foods/homepage/urfa-kebabi-card.png',
      'cig-kofte-nasil-yapilir-sanliurfa-tarifi': '/images/foods/homepage/cig-kofte-card.png',
      'sanliurfa-gezilecek-10-tarihi-yer': '/images/blog/tarihi-yerler-rehberi.jpg',
      'gobeklitepe-rehberi-ziyaret-bilgileri': '/images/blog/gobeklitepe.jpg',
      'halfetide-1-gun-tekne-turu': '/images/blog/halfeti.jpg',
      'harran-konik-evleri-mimari-hikayesi': '/images/blog/harran.jpg',
      'sanliurfada-kahvalti-7-efsane-mekan': '/images/blog/sanliurfa-lezzetler-2026.webp',
      'sanliurfa-muzeleri-rehberi': '/images/blog/mozaik-muzesi.jpg',
      'sanliurfa-konaklama-otel-rehberi': '/images/blog/sanliurfa-otel-2026.webp',
    },
    pools: {
      places: [
        '/images/places/balikligol/main-card.webp',
        '/images/places/gobeklitepe/hero-card.webp',
        '/images/places/gobeklitepe/detail-1-card.webp',
        '/images/places/cigerci-aziz-usta/food-card.webp',
        '/images/places/hanehan-otel/exterior-card.webp',
        '/images/places/hanehan-otel/room-card.webp',
      ],
      historical: [
        '/images/blog/gobeklitepe.jpg',
        '/images/blog/balikligol.jpg',
        '/images/blog/harran.jpg',
        '/images/blog/halfeti.jpg',
        '/images/blog/urfa-kalesi.jpg',
      ],
      recipes: [
        '/images/foods/homepage/urfa-kebabi-card.png',
        '/images/foods/homepage/sillik-tatlisi-card.png',
        '/images/foods/homepage/cig-kofte-card.png',
        '/images/foods/homepage/patlican-kebabi-card.png',
        '/images/foods/homepage/borani-card.png',
        '/images/foods/homepage/lebeni-card.png',
      ],
      blog: [
        '/images/blog/tarihi-yerler-rehberi.jpg',
        '/images/blog/mozaik-muzesi.jpg',
        '/images/blog/halfeti.jpg',
        '/images/blog/urfa-kalesi.jpg',
      ],
    },
  },
} as const;

export const pickMappedImage = (pool: keyof typeof IMAGE_MAP.pools, seed: number) => {
  const list = IMAGE_MAP.pools[pool];
  return list[Math.abs(seed) % list.length].src;
};

export type HomepageImageCategory = keyof typeof IMAGE_MAP.homepage.pools;

export const getHomepageCuratedImage = (
  category: Exclude<keyof typeof IMAGE_MAP.homepage, 'pools'>,
  slug?: string | null,
) => {
  if (!slug) return null;
  const registry = IMAGE_MAP.homepage[category];
  return registry[slug as keyof typeof registry] || null;
};

export const pickHomepageFallbackImage = (
  category: HomepageImageCategory,
  seed: number,
  usedImages?: Set<string>,
) => {
  const pool = IMAGE_MAP.homepage.pools[category];
  const startIndex = Math.abs(seed) % pool.length;

  for (let index = 0; index < pool.length; index += 1) {
    const candidate = pool[(startIndex + index) % pool.length];
    if (!usedImages || !usedImages.has(candidate)) {
      return candidate;
    }
  }

  return pool[startIndex];
};
