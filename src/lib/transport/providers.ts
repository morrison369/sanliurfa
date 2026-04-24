export type TransportProviderSnapshot = {
  provider: string;
  ok: boolean;
  checkedAt: string;
  detail?: string;
};

async function pingJson(url: string): Promise<{ ok: boolean; detail?: string }> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { ok: false, detail: `status_${res.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'fetch_failed' };
  }
}

export async function collectTransportProviderSnapshots(): Promise<TransportProviderSnapshot[]> {
  const checkedAt = new Date().toISOString();
  const sources = [
    {
      provider: 'open-meteo-health',
      url: 'https://api.open-meteo.com/v1/forecast?latitude=37.1674&longitude=38.7955&current=temperature_2m',
    },
    {
      provider: 'custom-bus-provider',
      url: process.env.BUS_PROVIDER_URL || '',
    },
    {
      provider: 'custom-flight-provider',
      url: process.env.FLIGHT_PROVIDER_URL || '',
    },
  ];

  const result: TransportProviderSnapshot[] = [];
  for (const source of sources) {
    if (!source.url) {
      result.push({
        provider: source.provider,
        ok: false,
        checkedAt,
        detail: 'provider_url_not_configured',
      });
      continue;
    }
    const probe = await pingJson(source.url);
    result.push({
      provider: source.provider,
      ok: probe.ok,
      checkedAt,
      detail: probe.detail,
    });
  }
  return result;
}
