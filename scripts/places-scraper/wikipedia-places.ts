/**
 * Wikipedia Şanlıurfa Places Scraper
 * Extracts tourist attractions, restaurants, hotels from Turkish Wikipedia
 */

interface WikiPlace {
  name: string;
  type: string;
  description: string;
  coordinates?: { lat: number; lon: number };
  image?: string;
  wikiUrl: string;
  category: string;
}

// Şanlıurfa related Wikipedia pages to scrape
const URFA_WIKI_PAGES = [
  'Şanlıurfa_(il)',
  'Şanlıurfa_tarihi',
  'Balıklıgöl',
  'Göbeklitepe',
  'Harran',
  'Halfeti',
  'Birecik',
  'Siverek',
  'Viranşehir',
  'Suruç',
  'Ceylanpınar',
  'Akçakale',
  'Hilvan',
  'Bozova',
];

// Category mappings
const CATEGORY_MAPPINGS: Record<string, string> = {
  'tarihi yer': 'tarihi-yerler',
  'antik kent': 'tarihi-yerler',
  'kale': 'tarihi-yerler',
  'camii': 'dini',
  'mescit': 'dini',
  'türbe': 'dini',
  'kilise': 'dini',
  'müze': 'muze',
  'restoran': 'restoran',
  'lokanta': 'restoran',
  'kebap': 'restoran',
  'otel': 'otel',
  'pansiyon': 'otel',
  'park': 'park',
  'bahçe': 'park',
  'göl': 'dogal',
  'baraj': 'dogal',
  'mağara': 'dogal',
  'çarşı': 'alisveris',
  'bazaar': 'alisveris',
  'unesco': 'tarihi-yerler',
  'miras': 'tarihi-yerler',
};

/**
 * Fetch page from Wikipedia API
 */
async function fetchWikiPage(title: string): Promise<any> {
  const url = `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${title}: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch images for a page
 */
async function fetchPageImages(title: string): Promise<string[]> {
  const url = `https://tr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=images&format=json&origin=*`;
  const response = await fetch(url);
  const data = await response.json();
  
  const pages = data.query.pages;
  const page = Object.values(pages)[0] as any;
  
  if (page.images) {
    return page.images
      .filter((img: any) => !img.title.includes('Icon') && !img.title.includes('Logo'))
      .map((img: any) => img.title.replace('Dosya:', ''))
      .slice(0, 5);
  }
  
  return [];
}

/**
 * Get image URL from filename
 */
function getImageUrl(filename: string, width: number = 800): string {
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${filename.charAt(0)}/${filename.charAt(0)}${filename.charAt(1)}/${encodeURIComponent(filename)}/${width}px-${encodeURIComponent(filename)}`;
}

/**
 * Extract category from description
 */
function extractCategory(description: string, title: string): string {
  const lowerDesc = description.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  for (const [keyword, category] of Object.entries(CATEGORY_MAPPINGS)) {
    if (lowerDesc.includes(keyword) || lowerTitle.includes(keyword)) {
      return category;
    }
  }
  
  // Default categories based on title patterns
  if (lowerTitle.includes('göl') || lowerTitle.includes('baraj')) return 'dogal';
  if (lowerTitle.includes('cami') || lowerTitle.includes('türbe')) return 'dini';
  if (lowerTitle.includes('kale') || lowerTitle.includes('ören')) return 'tarihi-yerler';
  if (lowerTitle.includes('çarşı') || lowerTitle.includes('pazar')) return 'alisveris';
  
  return 'tarihi-yerler'; // default
}

/**
 * Scrape all places from Wikipedia
 */
export async function scrapeUrfaPlaces(): Promise<WikiPlace[]> {
  const places: WikiPlace[] = [];
  
  for (const pageTitle of URFA_WIKI_PAGES) {
    try {
      console.log(`Fetching: ${pageTitle}`);
      const data = await fetchWikiPage(pageTitle);
      
      if (data.type === 'disambiguation') {
        // Skip disambiguation pages
        continue;
      }
      
      const place: WikiPlace = {
        name: data.titles?.normalized || data.title,
        type: data.type,
        description: data.description || data.extract?.substring(0, 200) || '',
        coordinates: data.coordinates ? {
          lat: data.coordinates.lat,
          lon: data.coordinates.lon,
        } : undefined,
        image: data.originalimage?.source || data.thumbnail?.source,
        wikiUrl: data.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${pageTitle}`,
        category: extractCategory(data.description || '', data.title),
      };
      
      places.push(place);
      
      // Rate limiting
      await delay(1000);
    } catch (error) {
      console.error(`Error fetching ${pageTitle}:`, error);
    }
  }
  
  return places;
}

/**
 * Search Wikipedia for Urfa places
 */
export async function searchWikiPlaces(query: string): Promise<WikiPlace[]> {
  const searchUrl = `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=20`;
  
  const response = await fetch(searchUrl);
  const data = await response.json();
  
  const places: WikiPlace[] = [];
  
  for (const result of data.query.search) {
    try {
      const pageData = await fetchWikiPage(result.title);
      
      const place: WikiPlace = {
        name: pageData.title,
        type: pageData.type,
        description: pageData.description || pageData.extract?.substring(0, 200) || result.snippet,
        coordinates: pageData.coordinates ? {
          lat: pageData.coordinates.lat,
          lon: pageData.coordinates.lon,
        } : undefined,
        image: pageData.originalimage?.source || pageData.thumbnail?.source,
        wikiUrl: pageData.content_urls?.desktop?.page,
        category: extractCategory(pageData.description || '', pageData.title),
      };
      
      places.push(place);
      await delay(500);
    } catch (error) {
      console.error(`Error fetching ${result.title}:`, error);
    }
  }
  
  return places;
}

/**
 * Generate MDX content from Wiki place
 */
export function generateMDX(place: WikiPlace): string {
  const frontmatter = {
    title: place.name,
    description: place.description,
    category: place.category,
    ...(place.coordinates && {
      lat: place.coordinates.lat,
      lon: place.coordinates.lon,
    }),
    ...(place.image && { image: place.image }),
    wikiUrl: place.wikiUrl,
    source: 'wikipedia',
    addedAt: new Date().toISOString(),
  };
  
  const frontmatterYaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (value === undefined) return null;
      if (typeof value === 'string') return `${key}: "${value}"`;
      return `${key}: ${value}`;
    })
    .filter(Boolean)
    .join('\n');
  
  return `---
${frontmatterYaml}
---

# ${place.name}

${place.description}

## Hakkında

${place.name}, Şanlıurfa'da önemli bir ${place.category} kategorisinde yer almaktadır.

${place.coordinates ? `
## Konum

- **Enlem:** ${place.coordinates.lat}
- **Boylam:** ${place.coordinates.lon}
` : ''}

## Daha Fazla Bilgi

[Daha fazla bilgi için Wikipedia sayfasını ziyaret edin](${place.wikiUrl})

---

*Bu içerik Wikipedia'dan otomatik olarak çekilmiştir. Lütfen güncel bilgiler için yerel kaynakları kontrol edin.*
`;
}

/**
 * Save places to MDX files
 */
export async function savePlacesToMDX(places: WikiPlace[], outputDir: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  for (const place of places) {
    const slug = slugify(place.name);
    const filename = `${slug}.mdx`;
    const filepath = path.join(outputDir, filename);
    
    const mdxContent = generateMDX(place);
    await fs.writeFile(filepath, mdxContent, 'utf-8');
    
    console.log(`Saved: ${filename}`);
  }
}

/**
 * Create slug from name
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
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI usage
if (import.meta.main) {
  console.log('🔍 Şanlıurfa mekanları Wikipedia\'dan çekiliyor...\n');
  
  scrapeUrfaPlaces().then(places => {
    console.log(`\n✅ ${places.length} mekan bulundu`);
    
    // Group by category
    const byCategory = places.reduce((acc, place) => {
      acc[place.category] = (acc[place.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nKategorilere göre dağılım:');
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    
    // Save to files
    const outputDir = './src/content/places-auto';
    savePlacesToMDX(places, outputDir);
    
    console.log(`\n💾 Dosyalar ${outputDir} dizinine kaydedildi`);
  });
}
