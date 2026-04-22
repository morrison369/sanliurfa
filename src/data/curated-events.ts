export type CuratedEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category:
    | "kultur-sanat"
    | "gastronomi"
    | "muzik"
    | "spor"
    | "egitim"
    | "diger";
  location: string;
  image_url: string;
  start_date: string;
  end_date: string | null;
  start_time: string;
  is_featured: boolean;
  status: "published";
  creator_name: string;
};

export const curatedEvents: CuratedEvent[] = [
  {
    id: "curated-event-gobeklitepe-kultur-rotasi",
    slug: "gobeklitepe-kultur-rotasi",
    title: "Göbeklitepe Kültür Rotası",
    description:
      "Şanlıurfa tarihini Göbeklitepe odağında anlatan rehberli kültür rotası. Programda ören yeri gezisi, bölgenin arkeolojik önemi ve Şanlıurfa şehir hafızasına etkisi ele alınır.",
    category: "kultur-sanat",
    location: "Göbeklitepe Ören Yeri",
    image_url: "/images/historical/gobeklitepe.jpg",
    start_date: "2026-05-18",
    end_date: null,
    start_time: "10:00",
    is_featured: true,
    status: "published",
    creator_name: "sanliurfa.com editörleri",
  },
  {
    id: "curated-event-balikligol-fotograf-yuruyusu",
    slug: "balikligol-fotograf-yuruyusu",
    title: "Balıklıgöl Fotoğraf Yürüyüşü",
    description:
      "Balıklıgöl, Aynzeliha Gölü ve tarihi çarşı çevresinde düzenlenen şehir fotoğraf yürüyüşü. Şanlıurfa silüeti, gün batımı ve yerel yaşam kareleri için uygulamalı rota sunar.",
    category: "kultur-sanat",
    location: "Balıklıgöl ve Tarihi Çarşı",
    image_url: "/images/historical/balikligol.jpg",
    start_date: "2026-06-07",
    end_date: null,
    start_time: "17:30",
    is_featured: true,
    status: "published",
    creator_name: "sanliurfa.com editörleri",
  },
  {
    id: "curated-event-sanliurfa-gastronomi-gunu",
    slug: "sanliurfa-gastronomi-gunu",
    title: "Şanlıurfa Gastronomi Günü",
    description:
      "Urfa kebabı, çiğ köfte, isot, şıllık tatlısı ve yöresel sofra kültürünü tanıtan gastronomi buluşması. Şanlıurfa mutfağını keşfetmek isteyenler için tadım ve anlatım programı içerir.",
    category: "gastronomi",
    location: "Şanlıurfa Merkez",
    image_url: "/images/foods/urfa-kebabi.jpg",
    start_date: "2026-09-14",
    end_date: null,
    start_time: "12:00",
    is_featured: false,
    status: "published",
    creator_name: "sanliurfa.com editörleri",
  },
  {
    id: "curated-event-harran-tarih-bulusmasi",
    slug: "harran-tarih-bulusmasi",
    title: "Harran Tarih Buluşması",
    description:
      "Harran konik kubbeli evleri, Ulu Cami kalıntıları ve geleneksel yaşam dokusu etrafında hazırlanan tarih buluşması. Rota, Şanlıurfa çevresindeki kültürel mirası görünür kılar.",
    category: "kultur-sanat",
    location: "Harran",
    image_url: "/images/placeholder-historical.jpg",
    start_date: "2026-10-03",
    end_date: null,
    start_time: "11:00",
    is_featured: false,
    status: "published",
    creator_name: "sanliurfa.com editörleri",
  },
];

export function getCuratedEvents(limit?: number): CuratedEvent[] {
  const sortedEvents = [...curatedEvents].sort((a, b) => {
    if (a.is_featured !== b.is_featured) {
      return a.is_featured ? -1 : 1;
    }

    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });

  return typeof limit === "number"
    ? sortedEvents.slice(0, limit)
    : sortedEvents;
}

export function getCuratedEventBySlug(slug?: string): CuratedEvent | undefined {
  return curatedEvents.find((event) => event.slug === slug);
}

export function searchCuratedEvents(searchTerm: string): CuratedEvent[] {
  const normalizedTerm = searchTerm.trim().toLocaleLowerCase("tr-TR");

  if (!normalizedTerm) {
    return getCuratedEvents();
  }

  return getCuratedEvents().filter((event) => {
    return [event.title, event.description, event.location, event.category]
      .join(" ")
      .toLocaleLowerCase("tr-TR")
      .includes(normalizedTerm);
  });
}
