export type TransportProviderSnapshot = {
  key: 'bus' | 'flight';
  label: string;
  ok: boolean;
  source: string;
  checkedAt: string;
  freshnessMinutes: number;
  route: string;
  note: string;
};

const TRANSPORT_PROVIDERS: Array<Omit<TransportProviderSnapshot, 'checkedAt'>> = [
  {
    key: 'bus',
    label: 'Şanlıurfa Otobüs Saatleri',
    ok: true,
    source: 'sanliurfa.com city-service content',
    freshnessMinutes: 60,
    route: '/ulasim/otobus-saatleri',
    note: 'Otobüs saatleri şehir rehberi içerik yüzeyi üzerinden yayınlanıyor',
  },
  {
    key: 'flight',
    label: 'Şanlıurfa Uçak Saatleri',
    ok: true,
    source: 'sanliurfa.com city-service content',
    freshnessMinutes: 60,
    route: '/ulasim/ucak-saatleri',
    note: 'Uçuş planlama bilgileri GAP Havalimanı rehberi üzerinden yayınlanıyor',
  },
];

export async function collectTransportProviderSnapshots(): Promise<TransportProviderSnapshot[]> {
  const checkedAt = new Date().toISOString();
  return TRANSPORT_PROVIDERS.map((provider) => ({
    ...provider,
    checkedAt,
  }));
}
