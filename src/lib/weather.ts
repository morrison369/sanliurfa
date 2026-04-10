export type WeatherIconKey = 'sun' | 'cloud' | 'rain' | 'storm' | 'snow' | 'fog';

export interface WeatherSnapshot {
  current: {
    temp: number;
    feelsLike: number;
    condition: string;
    icon: WeatherIconKey;
    humidity: number;
    windSpeed: number;
    visibility: number;
    uvIndex: number;
  };
  forecast: Array<{
    day: string;
    icon: WeatherIconKey;
    high: number;
    low: number;
  }>;
}

const SANLIURFA_COORDS = {
  latitude: 37.1674,
  longitude: 38.7955
};

const FALLBACK_WEATHER: WeatherSnapshot = {
  current: {
    temp: 24,
    feelsLike: 26,
    condition: 'Acik',
    icon: 'sun',
    humidity: 45,
    windSpeed: 12,
    visibility: 10,
    uvIndex: 6
  },
  forecast: [
    { day: 'Pzt', icon: 'sun', high: 26, low: 14 },
    { day: 'Sal', icon: 'cloud', high: 24, low: 13 },
    { day: 'Car', icon: 'rain', high: 22, low: 12 },
    { day: 'Per', icon: 'sun', high: 25, low: 14 },
    { day: 'Cum', icon: 'sun', high: 27, low: 15 }
  ]
};

const WEATHER_CODE_MAP: Record<number, { condition: string; icon: WeatherIconKey }> = {
  0: { condition: 'Acik', icon: 'sun' },
  1: { condition: 'Cogunlukla acik', icon: 'sun' },
  2: { condition: 'Parcali bulutlu', icon: 'cloud' },
  3: { condition: 'Bulutlu', icon: 'cloud' },
  45: { condition: 'Sisli', icon: 'fog' },
  48: { condition: 'Kirali sis', icon: 'fog' },
  51: { condition: 'Hafif cise', icon: 'rain' },
  53: { condition: 'Cise', icon: 'rain' },
  55: { condition: 'Yogun cise', icon: 'rain' },
  56: { condition: 'Donan cise', icon: 'snow' },
  57: { condition: 'Yogun donan cise', icon: 'snow' },
  61: { condition: 'Hafif yagmur', icon: 'rain' },
  63: { condition: 'Yagmur', icon: 'rain' },
  65: { condition: 'Kuvvetli yagmur', icon: 'rain' },
  66: { condition: 'Donan yagmur', icon: 'snow' },
  67: { condition: 'Yogun donan yagmur', icon: 'snow' },
  71: { condition: 'Hafif kar', icon: 'snow' },
  73: { condition: 'Kar', icon: 'snow' },
  75: { condition: 'Yogun kar', icon: 'snow' },
  77: { condition: 'Kar tanesi', icon: 'snow' },
  80: { condition: 'Sağanak', icon: 'rain' },
  81: { condition: 'Kuvvetli sağanak', icon: 'rain' },
  82: { condition: 'Cok kuvvetli sağanak', icon: 'storm' },
  85: { condition: 'Kar sağanagi', icon: 'snow' },
  86: { condition: 'Yogun kar sağanagi', icon: 'snow' },
  95: { condition: 'Firtina', icon: 'storm' },
  96: { condition: 'Dolu ihtimalli firtina', icon: 'storm' },
  99: { condition: 'Yogun dolu firtinasi', icon: 'storm' }
};

function getWeatherMeta(code: number | undefined) {
  return WEATHER_CODE_MAP[code ?? -1] || { condition: 'Bilinmiyor', icon: 'cloud' as WeatherIconKey };
}

function getShortDayLabel(dateText: string): string {
  const day = new Intl.DateTimeFormat('tr-TR', { weekday: 'short', timeZone: 'Europe/Istanbul' }).format(
    new Date(`${dateText}T12:00:00+03:00`)
  );
  return day.replace('.', '');
}

export async function loadSanliurfaWeather(): Promise<WeatherSnapshot> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(SANLIURFA_COORDS.latitude));
  url.searchParams.set('longitude', String(SANLIURFA_COORDS.longitude));
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
      'visibility',
      'uv_index'
    ].join(',')
  );
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('forecast_days', '5');
  url.searchParams.set('timezone', 'Europe/Istanbul');

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      return FALLBACK_WEATHER;
    }

    const data = await response.json();
    const currentMeta = getWeatherMeta(data?.current?.weather_code);

    const forecast = Array.isArray(data?.daily?.time)
      ? data.daily.time.map((dateText: string, index: number) => {
          const meta = getWeatherMeta(data?.daily?.weather_code?.[index]);
          return {
            day: getShortDayLabel(dateText),
            icon: meta.icon,
            high: Math.round(data?.daily?.temperature_2m_max?.[index] ?? 0),
            low: Math.round(data?.daily?.temperature_2m_min?.[index] ?? 0)
          };
        })
      : FALLBACK_WEATHER.forecast;

    return {
      current: {
        temp: Math.round(data?.current?.temperature_2m ?? FALLBACK_WEATHER.current.temp),
        feelsLike: Math.round(data?.current?.apparent_temperature ?? FALLBACK_WEATHER.current.feelsLike),
        condition: currentMeta.condition,
        icon: currentMeta.icon,
        humidity: Math.round(data?.current?.relative_humidity_2m ?? FALLBACK_WEATHER.current.humidity),
        windSpeed: Math.round(data?.current?.wind_speed_10m ?? FALLBACK_WEATHER.current.windSpeed),
        visibility: Math.round(((data?.current?.visibility ?? 10000) as number) / 1000),
        uvIndex: Math.round(data?.current?.uv_index ?? FALLBACK_WEATHER.current.uvIndex)
      },
      forecast: forecast.slice(0, 5)
    };
  } catch {
    return FALLBACK_WEATHER;
  }
}
