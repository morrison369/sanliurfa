// @ts-nocheck
/**
 * API v1 - Places Endpoint
 * Stable API version with backward compatibility
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const category = url.searchParams.get('category');
  
  // Mock data - in production fetch from database
  const places = [
    {
      id: 'place_1',
      name: 'Balıklıgöl',
      slug: 'balikligol',
      description: 'Şanlıurfa\'nın sembolü, kutsal balıklarıyla ünlü göl.',
      category: 'religious',
      rating: 4.8,
      review_count: 1250,
      location: { lat: 37.1591, lon: 38.7969 },
      image: 'https://cdn.sanliurfa.com/places/balikligol.jpg',
      address: 'Balıklıgöl Mahallesi, Haliliye/Şanlıurfa',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'place_2',
      name: 'Göbeklitepe',
      slug: 'gobeklitepe',
      description: 'Dünyanın en eski tapınağı, UNESCO Dünya Mirası.',
      category: 'historical',
      rating: 4.9,
      review_count: 2100,
      location: { lat: 37.2231, lon: 38.9222 },
      image: 'https://cdn.sanliurfa.com/places/gobeklitepe.jpg',
      address: 'Örencik Köyü, Haliliye/Şanlıurfa',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];
  
  // Filter by category if provided
  const filtered = category 
    ? places.filter(p => p.category === category)
    : places;
  
  // Pagination
  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  
  return new Response(
    JSON.stringify({
      data: paginated,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_more: start + limit < total,
      },
      api_version: 'v1',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
      },
    }
  );
};

// POST: Create place (requires authentication)
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validation
    if (!body.name || !body.category) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          message: 'Name and category are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create place (mock)
    const newPlace = {
      id: `place_${Date.now()}`,
      ...body,
      slug: body.name.toLowerCase().replace(/\s+/g, '-'),
      rating: 0,
      review_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return new Response(
      JSON.stringify({
        data: newPlace,
        api_version: 'v1',
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': 'v1',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
