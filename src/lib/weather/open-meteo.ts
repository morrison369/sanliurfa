type WeatherApiPayload = {
  fetchedAt: string;
  source: 'open-meteo';
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: {
    temperature: number | null;
    feelsLike: number | null;
    humidity: number | null;
    windSpeed: number | null;
    visibilityKm: number | null;
    uvIndex: number | null;
    weatherCode: number | null;
    weatherLabel: string;
  };
  forecast: Array<{
    date: string;
    dayLabel: string;
    high: number | null;
    low: number | null;
    weatherCode: number | null;
    weatherLabel: string;
  }>;
};

const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=37.1674&longitude=38.7955&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,visibility,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FIstanbul&forecast_days=5';

const WEATHER_CODE_TR: Record<number, string> = {
  0: 'Açık',
  1: 'Az Bulutlu',
  2: 'Parçalı Bulutlu',
  3: 'Bulutlu',
  45: 'Sisli',
  48: 'Kırağılı Sis',
  51: 'Çisenti',
  53: 'Çisenti',
  55: 'Yoğun Çisenti',
  61: 'Hafif Yağmur',
  63: 'Yağmur',
  65: 'Kuvvetli Yağmur',
  71: 'Hafif Kar',
  73: 'Kar',
  75: 'Yoğun Kar',
  80: 'Sağanak',
  81: 'Sağanak',
  82: 'Kuvvetli Sağanak',
  95: 'Gök Gürültülü Sağanak',
};

let cachedPayload: WeatherApiPayload | null = null;
let cachedAt = 0;
const DEFAULT_TTL_MS = 30 * 60 * 1000;

function toDayLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('tr-TR', { weekday: 'short' });
}

function toWeatherLabel(code: number | null | undefined): string {
  if (typeof code !== 'number') return 'Güncel';
  return WEATHER_CODE_TR[code] || 'Güncel';
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function buildPayload(data: any): WeatherApiPayload {
  const current = data?.current || {};
  const daily = data?.daily || {};
  const dates: string[] = Array.isArray(daily.time) ? daily.time : [];
  const highs: Array<number | null> = Array.isArray(daily.temperature_2m_max)
    ? daily.temperature_2m_max.map((v: unknown) => toNumber(v))
    : [];
  const lows: Array<number | null> = Array.isArray(daily.temperature_2m_min)
    ? daily.temperature_2m_min.map((v: unknown) => toNumber(v))
    : [];
  const codes: Array<number | null> = Array.isArray(daily.weather_code)
    ? daily.weather_code.map((v: unknown) => toNumber(v))
    : [];

  return {
    fetchedAt: new Date().toISOString(),
    source: 'open-meteo',
    location: {
      name: 'Şanlıurfa',
      latitude: 37.1674,
      longitude: 38.7955,
      timezone: 'Europe/Istanbul',
    },
    current: {
      temperature: toNumber(current.temperature_2m),
      feelsLike: toNumber(current.apparent_temperature),
      humidity: toNumber(current.relative_humidity_2m),
      windSpeed: toNumber(current.wind_speed_10m),
      visibilityKm: (() => {
        const visibility = toNumber(current.visibility);
        return visibility === null ? null : Math.round((visibility / 1000) * 10) / 10;
      })(),
      uvIndex: toNumber(current.uv_index),
      weatherCode: toNumber(current.weather_code),
      weatherLabel: toWeatherLabel(toNumber(current.weather_code)),
    },
    forecast: dates.map((date, idx) => ({
      date,
      dayLabel: toDayLabel(date),
      high: highs[idx] ?? null,
      low: lows[idx] ?? null,
      weatherCode: codes[idx] ?? null,
      weatherLabel: toWeatherLabel(codes[idx] ?? null),
    })),
  };
}

export async function getSanliurfaWeather(options?: { forceRefresh?: boolean; ttlMs?: number }) {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();
  const isFresh = cachedPayload && now - cachedAt < ttlMs;
  if (!options?.forceRefresh && isFresh) {
    return { payload: cachedPayload, fromCache: true };
  }

  try {
    const response = await fetch(OPEN_METEO_URL, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Weather upstream error: ${response.status}`);
    }

    const data = await response.json();
    const payload = buildPayload(data);
    cachedPayload = payload;
    cachedAt = now;
    return { payload, fromCache: false };
  } catch (error) {
    // Return stale cache when upstream is unavailable to keep UI resilient.
    if (cachedPayload) {
      return { payload: cachedPayload, fromCache: true };
    }
    throw error;
  }
}
