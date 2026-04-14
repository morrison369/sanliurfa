/**
 * OpenStreetMap Şanlıurfa Places Scraper
 * Extracts places from OSM using Overpass API
 * Completely free, no API key required
 */

interface OSMPlace {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  cuisine?: string;
  rating?: number;
  tags: Record<string, string>;
}

// Şanlıurfa bounding box
const URFA_BBOX = {
  minLat: 36.5,
  maxLat: 37.5,
  minLon: 38.0,
  maxLon: 40.0,
};

// Category mappings from OSM tags
const OSM_CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  'amenity=restaurant': { category: 'restoran', subcategory: 'restoran' },
  'amenity=cafe': { category: 'cafe', subcategory: 'kafe' },
  'amenity=fast_food': { category: 'restoran', subcategory: 'fast-food' },
  'amenity=bar': { category: 'eglence', subcategory: 'bar' },
  'amenity=pub': { category: 'eglence', subcategory: 'pub' },
  'amenity=hotel': { category: 'otel', subcategory: 'otel' },
  'amenity=guest_house': { category: 'otel', subcategory: 'pansiyon' },
  'amenity=motel': { category: 'otel', subcategory: 'motel' },
  'amenity=museum': { category: 'muze', subcategory: 'muze' },
  'amenity=place_of_worship': { category: 'dini', subcategory: 'ibadet-yeri' },
  'amenity=hospital': { category: 'saglik', subcategory: 'hastane' },
  'amenity=pharmacy': { category: 'saglik', subcategory: 'eczane' },
  'amenity=clinic': { category: 'saglik', subcategory: 'klinik' },
  'amenity=parking': { category: 'ulasim', subcategory: 'otopark' },
  'amenity=fuel': { category: 'ulasim', subcategory: 'benzinlik' },
  'amenity=bank': { category: 'finans', subcategory: 'banka' },
  'amenity=atm': { category: 'finans', subcategory: 'atm' },
  'amenity=library': { category: 'egitim', subcategory: 'kutuphane' },
  'amenity=school': { category: 'egitim', subcategory: 'okul' },
  'amenity=university': { category: 'egitim', subcategory: 'universite' },
  'amenity=cinema': { category: 'eglence', subcategory: 'sinema' },
  'amenity=theatre': { category: 'eglence', subcategory: 'tiyatro' },
  'amenity=nightclub': { category: 'eglence', subcategory: 'gece-kulubu' },
  'amenity=marketplace': { category: 'alisveris', subcategory: 'pazar' },
  'shop=supermarket': { category: 'alisveris', subcategory: 'supermarket' },
  'shop=convenience': { category: 'alisveris', subcategory: 'market' },
  'shop=mall': { category: 'alisveris', subcategory: 'avm' },
  'shop=clothes': { category: 'alisveris', subcategory: 'giyim' },
  'shop=shoes': { category: 'alisveris', subcategory: 'ayakkabi' },
  'shop=electronics': { category: 'alisveris', subcategory: 'elektronik' },
  'shop=car': { category: 'alisveris', subcategory: 'galeri' },
  'shop=bakery': { category: 'alisveris', subcategory: 'firin' },
  'shop=butcher': { category: 'alisveris', subcategory: 'kasap' },
  'tourism=hotel': { category: 'otel', subcategory: 'otel' },
  'tourism=guest_house': { category: 'otel', subcategory: 'misafirhane' },
  'tourism=attraction': { category: 'tarihi-yerler', subcategory: 'cazibe-merkezi' },
  'tourism=museum': { category: 'muze', subcategory: 'muze' },
  'tourism=viewpoint': { category: 'dogal', subcategory: 'manzara-noktasi' },
  'historic=monument': { category: 'tarihi-yerler', subcategory: 'anit' },
  'historic=ruins': { category: 'tarihi-yerler', subcategory: 'harabe' },
  'historic=archaeological_site': { category: 'tarihi-yerler', subcategory: 'arkeolojik-alan' },
  'historic=castle': { category: 'tarihi-yerler', subcategory: 'kale' },
  'leisure=park': { category: 'park', subcategory: 'park' },
  'leisure=garden': { category: 'park', subcategory: 'bahce' },
  'leisure=sports_centre': { category: 'spor', subcategory: 'spor-merkezi' },
  'leisure=stadium': { category: 'spor', subcategory: 'stadyum' },
  'leisure=swimming_pool': { category: 'spor', subcategory: 'havuz' },
  'sport=soccer': { category: 'spor', subcategory: 'futbol' },
  'sport=basketball': { category: 'spor', subcategory: 'basketbol' },
  'sport=swimming': { category: 'spor', subcategory: 'yuzme' },
  'natural=water': { category: 'dogal', subcategory: 'su' },
  'natural=lake': { category: 'dogal', subcategory: 'gol' },
  'natural=beach': { category: 'dogal', subcategory: 'plaj' },
  'natural=cave_entrance': { category: 'dogal', subcategory: 'magara' },
  'natural=peak': { category: 'dogal', subcategory: 'tepe' },
};

/**
 * Build Overpass QL query for places
 */
function buildOverpassQuery(bbox: typeof URFA_BBOX, limit: number = 1000): string {
  const tags = [
    'amenity',
    'tourism',
    'shop',
    'historic',
    'leisure',
    'sport',
    'natural',
  ];

  const bboxStr = `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`;

  const queries = tags.map(tag => `
    node["${tag}"](${bboxStr});
    way["${tag}"](${bboxStr});
    relation["${tag}"](${bboxStr});
  `).join('\n');

  return `[out:json][timeout:60];
(
  ${queries}
);
out body center;
>;
out skel qt;
`;
}

/**
 * Fetch places from Overpass API
 */
export async function fetchOSMPlaces(bbox = URFA_BBOX): Promise<OSMPlace[]> {
  const query = buildOverpassQuery(bbox);
  
  console.log('🌐 OpenStreetMap\'ten veri çekiliyor...\n');
  
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  
  console.log(`📊 Toplam ${data.elements.length} element bulundu`);
  
  return parseOSMElements(data.elements);
}

/**
 * Parse OSM elements into places
 */
function parseOSMElements(elements: any[]): OSMPlace[] {
  const places: OSMPlace[] = [];
  const seen = new Set<string>();

  for (const element of elements) {
    const tags = element.tags || {};
    
    // Skip unnamed places
    if (!tags.name) continue;
    
    // Skip duplicates
    const key = `${tags.name}-${element.lat || element.center?.lat}-${element.lon || element.center?.lon}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    // Determine category
    const { category, subcategory } = determineCategory(tags);
    if (!category) continue;
    
    const place: OSMPlace = {
      id: `osm-${element.type}-${element.id}`,
      name: tags.name,
      category,
      subcategory,
      latitude: element.lat || element.center?.lat,
      longitude: element.lon || element.center?.lon,
      address: buildAddress(tags),
      phone: tags.phone,
      website: tags.website,
      openingHours: tags.opening_hours,
      cuisine: tags.cuisine,
      tags,
    };
    
    places.push(place);
  }

  return places;
}

/**
 * Determine category from OSM tags
 */
function determineCategory(tags: Record<string, string>): { category: string; subcategory: string } | null {
  for (const [key, value] of Object.entries(tags)) {
    const mapping = OSM_CATEGORY_MAP[`${key}=${value}`];
    if (mapping) return mapping;
  }
  
  // Fallback mappings
  if (tags.amenity) {
    return { category: 'diger', subcategory: tags.amenity };
  }
  if (tags.tourism) {
    return { category: 'tarihi-yerler', subcategory: tags.tourism };
  }
  if (tags.shop) {
    return { category: 'alisveris', subcategory: tags.shop };
  }
  if (tags.historic) {
    return { category: 'tarihi-yerler', subcategory: tags.historic };
  }
  
  return null;
}

/**
 * Build address string from tags
 */
function buildAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'] ? `No: ${tags['addr:housenumber']}` : null,
    tags['addr:neighbourhood'],
    tags['addr:district'],
    tags['addr:city'] || 'Şanlıurfa',
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Fetch places by category
 */
export async function fetchPlacesByCategory(
  category: string,
  bbox = URFA_BBOX
): Promise<OSMPlace[]> {
  const allPlaces = await fetchOSMPlaces(bbox);
  return allPlaces.filter(p => p.category === category);
}

/**
 * Fetch places by district (approximate)
 */
export async function fetchPlacesByDistrict(
  district: string,
  bbox = URFA_BBOX
): Promise<OSMPlace[]> {
  const allPlaces = await fetchOSMPlaces(bbox);
  return allPlaces.filter(p => 
    p.address?.toLowerCase().includes(district.toLowerCase())
  );
}

/**
 * Search places by name
 */
export async function searchOSMPlaces(
  query: string,
  bbox = URFA_BBOX
): Promise<OSMPlace[]> {
  const allPlaces = await fetchOSMPlaces(bbox);
  const lowerQuery = query.toLowerCase();
  
  return allPlaces.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.category.includes(lowerQuery) ||
    p.subcategory.includes(lowerQuery)
  );
}

/**
 * Get nearby places
 */
export function getNearbyPlaces(
  places: OSMPlace[],
  lat: number,
  lon: number,
  radiusKm: number = 5
): OSMPlace[] {
  return places
    .map(p => ({
      place: p,
      distance: calculateDistance(lat, lon, p.latitude, p.longitude),
    }))
    .filter(({ distance }) => distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .map(({ place, distance }) => ({
      ...place,
      tags: { ...place.tags, distance: distance.toFixed(2) },
    }));
}

/**
 * Calculate distance between coordinates (km)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Generate MDX from OSM place
 */
export function generateMDX(place: OSMPlace): string {
  const features: string[] = [];
  if (place.tags.wifi) features.push('WiFi');
  if (place.tags.wheelchair === 'yes') features.push('Engelli Erişimi');
  if (place.tags.outdoor_seating === 'yes') features.push('Açık Alan');
  if (place.tags.delivery === 'yes') features.push('Paket Servis');
  if (place.tags.reservation === 'yes') features.push('Rezervasyon');
  
  const frontmatter = {
    title: place.name,
    description: `${place.name} - ${place.subcategory}`,
    category: place.category,
    subcategory: place.subcategory,
    lat: place.latitude,
    lon: place.longitude,
    ...(place.phone && { phone: place.phone }),
    ...(place.website && { website: place.website }),
    ...(place.openingHours && { openingHours: place.openingHours }),
    ...(place.cuisine && { cuisine: place.cuisine }),
    ...(features.length > 0 && { features }),
    address: place.address,
    source: 'openstreetmap',
    osmId: place.id,
    addedAt: new Date().toISOString(),
  };
  
  const frontmatterYaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (value === undefined) return null;
      if (Array.isArray(value)) return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
      if (typeof value === 'string') return `${key}: "${value}"`;
      return `${key}: ${value}`;
    })
    .filter(Boolean)
    .join('\n');
  
  return `---
${frontmatterYaml}
---

# ${place.name}

**Kategori:** ${place.subcategory}

${place.address ? `📍 **Adres:** ${place.address}` : ''}
${place.phone ? `📞 **Telefon:** ${place.phone}` : ''}
${place.website ? `🌐 **Web:** [${place.website}](${place.website})` : ''}
${place.openingHours ? `⏰ **Çalışma Saatleri:** ${place.openingHours}` : ''}
${place.cuisine ? `🍽️ **Mutfak:** ${place.cuisine}` : ''}

${features.length > 0 ? `
## Özellikler

${features.map(f => `- ${f}`).join('\n')}
` : ''}

## Konum

- **Enlem:** ${place.latitude}
- **Boylam:** ${place.longitude}

[Google Maps'te Aç](https://www.google.com/maps?q=${place.latitude},${place.longitude})
[OpenStreetMap'te Aç](https://www.openstreetmap.org/${place.id.replace('-', '/')})

---

*Bu içerik OpenStreetMap'ten otomatik olarak çekilmiştir. Lütfen güncel bilgiler için doğrulama yapın.*
`;
}

/**
 * Save places to MDX files organized by category
 */
export async function savePlacesToMDX(
  places: OSMPlace[],
  outputDir: string
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Group by category
  const byCategory = places.reduce((acc, place) => {
    if (!acc[place.category]) acc[place.category] = [];
    acc[place.category].push(place);
    return acc;
  }, {} as Record<string, OSMPlace[]>);
  
  for (const [category, categoryPlaces] of Object.entries(byCategory)) {
    const categoryDir = path.join(outputDir, category);
    await fs.mkdir(categoryDir, { recursive: true });
    
    for (const place of categoryPlaces) {
      const slug = slugify(place.name);
      const filename = `${slug}.mdx`;
      const filepath = path.join(categoryDir, filename);
      
      const mdxContent = generateMDX(place);
      await fs.writeFile(filepath, mdxContent, 'utf-8');
    }
    
    console.log(`💾 ${category}: ${categoryPlaces.length} mekan kaydedildi`);
  }
}

/**
 * Create slug
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get statistics
 */
export function getStats(places: OSMPlace[]) {
  const byCategory = places.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const bySubcategory = places.reduce((acc, p) => {
    acc[p.subcategory] = (acc[p.subcategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const withPhone = places.filter(p => p.phone).length;
  const withWebsite = places.filter(p => p.website).length;
  const withOpeningHours = places.filter(p => p.openingHours).length;
  
  return {
    total: places.length,
    byCategory,
    bySubcategory: Object.entries(bySubcategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10),
    withPhone,
    withWebsite,
    withOpeningHours,
  };
}

// CLI usage
if (import.meta.main) {
  console.log('🗺️  OpenStreetMap Şanlıurfa Mekan Tarayıcı\n');
  
  fetchOSMPlaces()
    .then(places => {
      const stats = getStats(places);
      
      console.log('\n📊 İSTATİSTİKLER');
      console.log(`Toplam mekan: ${stats.total}`);
      console.log(`Telefon bilgisi: ${stats.withPhone}`);
      console.log(`Web sitesi: ${stats.withWebsite}`);
      console.log(`Çalışma saati: ${stats.withOpeningHours}\n`);
      
      console.log('📁 KATEGORİLER');
      Object.entries(stats.byCategory)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, count]) => {
          console.log(`  ${cat}: ${count}`);
        });
      
      console.log('\n🏷️  EN POPÜLER ALT KATEGORİLER');
      stats.bySubcategory.forEach(([sub, count]) => {
        console.log(`  ${sub}: ${count}`);
      });
      
      // Save to files
      const outputDir = './src/content/places-osm';
      return savePlacesToMDX(places, outputDir);
    })
    .then(() => {
      console.log('\n✅ Tamamlandı!');
    })
    .catch(error => {
      console.error('❌ Hata:', error);
    });
}
