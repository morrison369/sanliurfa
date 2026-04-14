// @ts-nocheck
/**
 * Mobile Places API
 * Optimized for mobile apps with offline sync support
 */

import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../lib/postgres';

// GET: List places with pagination
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const category = url.searchParams.get('category');
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const radius = url.searchParams.get('radius'); // km

    // Mock data for now
    const places = [
      {
        id: 'place_1',
        name: 'Balıklıgöl',
        description: 'Şanlıurfa\'nın sembolü, kutsal balıklarıyla ünlü göl.',
        category: 'religious',
        rating: 4.8,
        reviewCount: 1250,
        location: { lat: 37.1591, lon: 38.7969 },
        images: ['https://sanliurfa.com/images/balikligol-1.jpg'],
        address: 'Balıklıgöl Mahallesi, Haliliye/Şanlıurfa',
        phone: '+90 414 123 45 67',
        openHours: '07:00 - 22:00',
        priceRange: 1,
        tags: ['tarihi', 'dini', 'turistik'],
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'place_2',
        name: 'Göbeklitepe',
        description: 'Dünyanın en eski tapınağı, UNESCO Dünya Mirası.',
        category: 'historical',
        rating: 4.9,
        reviewCount: 2100,
        location: { lat: 37.2231, lon: 38.9222 },
        images: ['https://sanliurfa.com/images/gobeklitepe-1.jpg'],
        address: 'Örencik Köyü, Haliliye/Şanlıurfa',
        phone: '+90 414 234 56 78',
        openHours: '08:00 - 18:00',
        priceRange: 2,
        tags: ['tarihi', 'arkeoloji', 'unesco'],
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'place_3',
        name: 'Harran',
        description: 'Konik kubbeli evleriyle ünlü antik şehir.',
        category: 'historical',
        rating: 4.6,
        reviewCount: 890,
        location: { lat: 36.86, lon: 39.03 },
        images: ['https://sanliurfa.com/images/harran-1.jpg'],
        address: 'Harran, Şanlıurfa',
        phone: '+90 414 345 67 89',
        openHours: '09:00 - 17:00',
        priceRange: 1,
        tags: ['tarihi', 'mimari', 'kültür'],
        lastUpdated: new Date().toISOString(),
      },
    ];

    // Filter by category
    let filtered = places;
    if (category) {
      filtered = places.filter(p => p.category === category);
    }

    // Filter by location
    if (lat && lon && radius) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      const rad = parseFloat(radius);

      filtered = filtered.filter(p => {
        const distance = calculateDistance(userLat, userLon, p.location.lat, p.location.lon);
        return distance <= rad;
      });
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return new Response(
      JSON.stringify({
        success: true,
        places: paginated,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Mobile places error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch places' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST: Sync places for offline mode
export const POST: APIRoute = async ({ request }) => {
  try {
    const { lastSync, categories, bounds } = await request.json();

    // Return places that have been updated since last sync
    const mockUpdates = [
      {
        id: 'place_1',
        action: 'update',
        data: {
          rating: 4.9,
          reviewCount: 1251,
          lastUpdated: new Date().toISOString(),
        },
      },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        updates: mockUpdates,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Sync failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
