/**
 * Unit Tests — weather/open-meteo.ts pure helpers (buildPayload + WEATHER_CODE_TR mapping)
 *
 * - WEATHER_CODE_TR Türkçe label mapping (0=Açık, 95=Gök Gürültülü Sağanak vb.)
 * - toWeatherLabel fallback "Güncel"
 * - toNumber Number.isFinite guard
 * - buildPayload (current + daily forecast struct)
 *
 * NOT: getSanliurfaWeather fetch-bağımlı (Open Meteo API call) — kapsam dışı.
 * Helper'lar private (export değil) — buildPayload üzerinden test edilir.
 */

import { describe, it, expect } from 'vitest';

// Pure helper imports yok (private); sadece getSanliurfaWeather export — fetch mock gerek.
// Bu test seti dışında doğrudan test edilemez. Bunun yerine helper davranışını
// indirect olarak doğrulamak için fetch mock + buildPayload data shape kontrolü.

import { vi, beforeEach, afterEach } from 'vitest';

const FAKE_OPEN_METEO_RESPONSE = {
  current: {
    temperature_2m: 25,
    apparent_temperature: 27,
    relative_humidity_2m: 60,
    wind_speed_10m: 5,
    visibility: 10000,
    uv_index: 5,
    weather_code: 0,
  },
  daily: {
    time: ['2026-05-05', '2026-05-06'],
    temperature_2m_max: [30, 32],
    temperature_2m_min: [18, 20],
    weather_code: [0, 1],
  },
};

const originalFetch = global.fetch;

beforeEach(() => {
  vi.resetModules(); // Open Meteo cache'i temizle (module-level cachedPayload)
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('buildPayload via getSanliurfaWeather (fetch mock)', () => {
  it('valid response → location Şanlıurfa + current temperature', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(FAKE_OPEN_METEO_RESPONSE),
    } as any);

    const { getSanliurfaWeather } = await import('../weather/open-meteo');
    const { payload } = await getSanliurfaWeather({ forceRefresh: true });
    expect(payload?.location.name).toBe('Şanlıurfa');
    expect(payload?.location.latitude).toBe(37.1674);
    expect(payload?.current.temperature).toBe(25);
  });

  it('weatherCode 0 → label "Açık"', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(FAKE_OPEN_METEO_RESPONSE),
    } as any);

    const { getSanliurfaWeather } = await import('../weather/open-meteo');
    const { payload } = await getSanliurfaWeather({ forceRefresh: true });
    expect(payload?.current.weatherLabel).toBe('Açık');
  });

  it('forecast — daily array zip (date, high, low, code)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(FAKE_OPEN_METEO_RESPONSE),
    } as any);

    const { getSanliurfaWeather } = await import('../weather/open-meteo');
    const { payload } = await getSanliurfaWeather({ forceRefresh: true });
    expect(payload?.forecast).toHaveLength(2);
    expect(payload?.forecast[0].high).toBe(30);
    expect(payload?.forecast[0].low).toBe(18);
  });

  it('weatherCode bilinmeyen → fallback "Güncel"', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ...FAKE_OPEN_METEO_RESPONSE,
        current: { ...FAKE_OPEN_METEO_RESPONSE.current, weather_code: 999 },
      }),
    } as any);

    const { getSanliurfaWeather } = await import('../weather/open-meteo');
    const { payload } = await getSanliurfaWeather({ forceRefresh: true });
    expect(payload?.current.weatherLabel).toBe('Güncel');
  });

  it('visibility — meters → km Math.round 0.1 precision', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ...FAKE_OPEN_METEO_RESPONSE,
        current: { ...FAKE_OPEN_METEO_RESPONSE.current, visibility: 12345 },
      }),
    } as any);

    const { getSanliurfaWeather } = await import('../weather/open-meteo');
    const { payload } = await getSanliurfaWeather({ forceRefresh: true });
    // 12345 / 1000 = 12.345 → round(*10)/10 = 12.3
    expect(payload?.current.visibilityKm).toBe(12.3);
  });

  it('current.temperature_2m null → toNumber returns null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ...FAKE_OPEN_METEO_RESPONSE,
        current: { ...FAKE_OPEN_METEO_RESPONSE.current, temperature_2m: null },
      }),
    } as any);

    const { getSanliurfaWeather } = await import('../weather/open-meteo');
    const { payload } = await getSanliurfaWeather({ forceRefresh: true });
    expect(payload?.current.temperature).toBeNull();
  });

  it('cache hit — ikinci call fromCache: true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(FAKE_OPEN_METEO_RESPONSE),
    } as any);

    const { getSanliurfaWeather } = await import('../weather/open-meteo');
    const a = await getSanliurfaWeather({ forceRefresh: true });
    const b = await getSanliurfaWeather();
    expect(a.fromCache).toBe(false);
    expect(b.fromCache).toBe(true);
  });

  it('upstream fail + cached payload yok → throw', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('500 error')),
    } as any);

    const { getSanliurfaWeather } = await import('../weather/open-meteo');
    await expect(getSanliurfaWeather({ forceRefresh: true })).rejects.toThrow();
  });
});
