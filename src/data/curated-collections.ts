export type CuratedCollection = {
  id: string;
  name: string;
  description: string;
  icon: string;
  place_count: number;
  follower_count: number;
  href: string;
};

export const curatedCollections: CuratedCollection[] = [
  {
    id: "curated-collection-tarihin-sifir-noktasi",
    name: "Tarihin Sıfır Noktası Rotası",
    description:
      "Göbeklitepe, Harran ve Balıklıgöl çevresindeki Şanlıurfa tarih durakları.",
    icon: "🏛️",
    place_count: 6,
    follower_count: 128,
    href: "/tarihi-yerler",
  },
  {
    id: "curated-collection-urfa-lezzetleri",
    name: "Şanlıurfa Lezzetleri",
    description:
      "Urfa kebabı, çiğ köfte, isot, şıllık tatlısı ve yöresel mutfak önerileri.",
    icon: "🍽️",
    place_count: 8,
    follower_count: 96,
    href: "/gastronomi",
  },
  {
    id: "curated-collection-aileyle-gezilecek-yerler",
    name: "Aileyle Gezilecek Yerler",
    description:
      "Şanlıurfa merkezinde aileyle planlanabilecek pratik gezi ve servis durakları.",
    icon: "📍",
    place_count: 7,
    follower_count: 74,
    href: "/places",
  },
];
