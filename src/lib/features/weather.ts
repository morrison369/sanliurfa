/**
 * Weather Integration Module
 * Şanlıurfa hava durumu entegrasyonu
 */

const WEATHER_CACHE_KEY = 'weather:sanliurfa';
const CACHE_TTL = 1800; // 30 dakika

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: 'güneşli' | 'bulutlu' | 'yağmurlu' | 'karlı' | 'rüzgarlı' | 'açık';
  description: string;
  icon: string;
  updatedAt: string;
}

/**
 * Get current weather for Şanlıurfa
 * Uses OpenWeatherMap API or mock data if API key not configured
 */
export async function getWeather(): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    // Mock data for development
    return getMockWeather();
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Şanlıurfa,TR&appid=${apiKey}&units=metric&lang=tr`
    );

    if (!response.ok) throw new Error('Weather API error');

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // m/s → km/h
      condition: translateCondition(data.weather[0].main),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return getMockWeather();
  }
}

function translateCondition(main: string): WeatherData['condition'] {
  const map: Record<string, WeatherData['condition']> = {
    Clear: 'güneşli',
    Clouds: 'bulutlu',
    Rain: 'yağmurlu',
    Snow: 'karlı',
    Drizzle: 'yağmurlu',
    Thunderstorm: 'yağmurlu',
  };
  return map[main] || 'açık';
}

function getMockWeather(): WeatherData {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 20;

  return {
    temp: isDay ? 28 : 22,
    feelsLike: isDay ? 30 : 20,
    humidity: 45,
    windSpeed: 12,
    condition: isDay ? 'güneşli' : 'açık',
    description: isDay ? 'Güneşli ve sıcak' : 'Açık ve serin',
    icon: isDay ? '01d' : '01n',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get weather icon URL
 */
export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Get weather description with recommendation
 */
export function getWeatherRecommendation(weather: WeatherData): string {
  if (weather.temp > 35) return 'Çok sıcak! Şapka ve su almayı unutmayın.';
  if (weather.temp > 30) return 'Sıcak bir gün, güneş kremi kullanın.';
  if (weather.temp > 20) return 'Gezi için harika bir gün!';
  if (weather.temp > 10) return 'Hafif bir ceket işinize yarayabilir.';
  return 'Soğuk bir gün, kalın giyin!';
}
