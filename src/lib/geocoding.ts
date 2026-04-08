/**
 * Geocoding Utilities
 * Reverse geocoding via OpenStreetMap Nominatim API (Free)
 */

import { getCache, setCache } from './cache';
import { logger } from './logging';

// Nominatim API endpoint
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';

// Rate limiting: 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

/**
 * Get address from coordinates (reverse geocoding)
 * Uses OpenStreetMap Nominatim API (free, no API key needed)
 */
export async function getAddressFromCoordinates(lat: number, lng: number): Promise<any | null> {
  try {
    // Check cache first
    const cacheKey = `sanliurfa:geocode:${lat.toFixed(6)}:${lng.toFixed(6)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    // Call Nominatim API
    const response = await fetch(
      `${NOMINATIM_API}?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=tr`,
      {
        headers: {
          'User-Agent': 'Sanliurfa.com (+https://sanliurfa.com)' // Required by Nominatim
        }
      }
    );

    if (!response.ok) {
      logger.warn('Nominatim API error', { status: response.status, lat, lng });
      return null;
    }

    const data = await response.json();

    const result = {
      address: data.address?.road || data.address?.village || data.address?.town || data.address?.city || 'Unknown',
      city: data.address?.city || data.address?.county || 'Şanlıurfa',
      country: data.address?.country || 'Turkey',
      displayName: data.display_name,
      placeId: data.place_id,
      lat: data.lat,
      lng: data.lon
    };

    // Cache for 7 days (addresses don't change)
    await setCache(cacheKey, result, 7 * 24 * 3600);

    return result;
  } catch (error) {
    logger.error('Geocoding failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get coordinates from address (forward geocoding)
 * Uses OpenStreetMap Nominatim API
 */
export async function getCoordinatesFromAddress(address: string): Promise<any | null> {
  try {
    // Check cache
    const cacheKey = `sanliurfa:address:${address.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    // Call Nominatim API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}, Şanlıurfa, Turkey&limit=1`,
      {
        headers: {
          'User-Agent': 'Sanliurfa.com (+https://sanliurfa.com)'
        }
      }
    );

    if (!response.ok || !Array.isArray(response)) {
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

    const result = {
      address: data[0].display_name,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      placeId: data[0].place_id
    };

    // Cache for 30 days
    await setCache(cacheKey, result, 30 * 24 * 3600);

    return result;
  } catch (error) {
    logger.error('Forward geocoding failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Search for places by name
 */
export async function searchPlaces(query: string, limit: number = 10): Promise<any[]> {
  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, Şanlıurfa&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'Sanliurfa.com (+https://sanliurfa.com)'
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      placeId: item.place_id,
      type: item.type
    }));
  } catch (error) {
    logger.error('Place search failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
