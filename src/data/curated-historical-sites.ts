export type CuratedHistoricalSite = {
  id: string;
  slug: string;
  name: string;
  description: string;
  short_description: string;
  location: string;
  period: string;
  opening_hours: string;
  entry_fee: string;
  images: string[];
  is_unesco: boolean;
  is_featured: boolean;
  status: 'active';
  latitude?: number;
  longitude?: number;
};

export const curatedHistoricalSites: CuratedHistoricalSite[] = [
  {
    id: 'historical-gobeklitepe',
    slug: 'gobeklitepe',
    name: 'Göbeklitepe',
    description:
      'Göbeklitepe, Şanlıurfa merkezine yakın konumuyla insanlık tarihinin bilinen en eski anıtsal yapılarından biridir. Neolitik döneme ait taş dikilitaşları, sembolleri ve arkeolojik önemiyle Şanlıurfa gezisinin ana duraklarından biri kabul edilir.',
    short_description: 'Tarihin sıfır noktası olarak anılan UNESCO mirası.',
    location: 'Örencik, Haliliye / Şanlıurfa',
    period: 'Neolitik Dönem',
    opening_hours: '08:30 - 17:30',
    entry_fee: 'Müze kart geçerlidir',
    images: ['/images/historical/gobeklitepe.jpg'],
    is_unesco: true,
    is_featured: true,
    status: 'active',
    latitude: 37.2231,
    longitude: 38.9224,
  },
  {
    id: 'historical-balikligol',
    slug: 'balikligol',
    name: 'Balıklıgöl',
    description:
      'Balıklıgöl, Şanlıurfa kent merkezinde inanç turizmi, tarihi çarşılar ve geleneksel şehir dokusunu aynı rota üzerinde buluşturur. Hz. İbrahim anlatısı, göl çevresi ve yakınındaki tarihi yapılarla ziyaretçilerin en çok uğradığı alanlardan biridir.',
    short_description: 'Şanlıurfa merkezde inanç ve tarih rotasının kalbi.',
    location: 'Eyyübiye / Şanlıurfa',
    period: 'Tarihi Kent Dokusu',
    opening_hours: 'Gün boyu açık',
    entry_fee: 'Ücretsiz',
    images: ['/images/historical/balikligol.jpg'],
    is_unesco: false,
    is_featured: true,
    status: 'active',
    latitude: 37.1495,
    longitude: 38.7913,
  },
  {
    id: 'historical-harran',
    slug: 'harran',
    name: 'Harran',
    description:
      'Harran, konik kubbeli evleri, antik kent kalıntıları ve Mezopotamya kültür havzasındaki yeriyle Şanlıurfa’nın en bilinen tarihi ilçelerinden biridir. Şehir merkezinden günübirlik gezi rotası olarak planlanabilir.',
    short_description: 'Konik kubbeli evleriyle tanınan tarihi ilçe.',
    location: 'Harran / Şanlıurfa',
    period: 'Antik Dönem',
    opening_hours: '08:00 - 18:00',
    entry_fee: 'Alanlara göre değişir',
    images: ['/images/placeholder-historical.jpg'],
    is_unesco: false,
    is_featured: true,
    status: 'active',
  },
];

export function getCuratedHistoricalSites(limit?: number): CuratedHistoricalSite[] {
  return typeof limit === 'number' ? curatedHistoricalSites.slice(0, limit) : curatedHistoricalSites;
}
