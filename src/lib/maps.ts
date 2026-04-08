/**
 * Maps Utilities
 * OpenStreetMap + Leaflet.js helpers for interactive maps
 */

import { getCache, setCache } from './cache';
import { queryMany } from './postgres';
import { logger } from './logging';

// Constants
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Get nearby places within radius (in km)
 */
export async function getNearbyPlaces(
  userLat: number,
  userLng: number,
  radiusKm: number = 5,
  limit: number = 10
): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:maps:nearby:${userLat.toFixed(4)}:${userLng.toFixed(4)}:${radiusKm}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    // Get all places with coordinates
    const places = await queryMany(
      `SELECT id, name, slug, latitude, longitude, category, rating, address
       FROM places
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       LIMIT 1000`
    );

    // Filter by distance
    const nearby = places
      .map((place: any) => ({
        ...place,
        distance: calculateDistance(userLat, userLng, place.latitude, place.longitude)
      }))
      .filter((place: any) => place.distance <= radiusKm)
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, limit);

    // Cache for 1 hour
    await setCache(cacheKey, nearby, 3600);

    return nearby;
  } catch (error) {
    logger.error('Failed to get nearby places', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get places by category with coordinates
 */
export async function getPlacesByCategory(
  category: string,
  limit: number = 20
): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:maps:category:${category}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    const places = await queryMany(
      `SELECT id, name, slug, latitude, longitude, category, rating, address, description
       FROM places
       WHERE category = $1
       AND latitude IS NOT NULL
       AND longitude IS NOT NULL
       ORDER BY rating DESC
       LIMIT $2`,
      [category, limit]
    );

    await setCache(cacheKey, places, 3600);
    return places;
  } catch (error) {
    logger.error('Failed to get places by category', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get all places with coordinates for map initialization
 */
export async function getAllPlacesForMap(limit: number = 500): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:maps:all-places';
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    const places = await queryMany(
      `SELECT id, name, slug, latitude, longitude, category, rating
       FROM places
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       LIMIT $1`,
      [limit]
    );

    await setCache(cacheKey, places, 3600);
    return places;
  } catch (error) {
    logger.error('Failed to get places for map', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Map configuration
 */
export const MAP_CONFIG = {
  // Şanlıurfa city center
  DEFAULT_CENTER: {
    lat: 37.1592,
    lng: 38.7969
  },
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,

  // Tile layers (OpenStreetMap)
  TILE_LAYERS: {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    osmTr: {
      // Turkey-specific OSM tiles
      url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }
  },

  // Marker colors by category
  MARKER_COLORS: {
    'Gezi': '#FF6B6B',
    'Yemek': '#FFD93D',
    'Kültür': '#6BCB77',
    'Etkinlik': '#4D96FF',
    'Rehber': '#A445BB',
    'default': '#FF9F43'
  }
};

/**
 * Get marker color for category
 */
export function getMarkerColor(category?: string): string {
  if (!category) return MAP_CONFIG.MARKER_COLORS.default;
  return (MAP_CONFIG.MARKER_COLORS as any)[category] || MAP_CONFIG.MARKER_COLORS.default;
}

/**
 * Format place info for popup
 */
export function formatPlacePopup(place: any): string {
  return `
    <div class="p-2">
      <h3 class="font-bold text-sm">${place.name}</h3>
      <p class="text-xs text-gray-600">${place.category}</p>
      ${place.rating ? `<p class="text-xs">⭐ ${place.rating.toFixed(1)}</p>` : ''}
      <a href="/places/${place.slug}" class="text-blue-600 text-xs hover:underline">Detaylar →</a>
    </div>
  `;
}

/**
 * Validate coordinates
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
