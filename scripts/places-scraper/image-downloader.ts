/**
 * Free Image Downloader for Şanlıurfa Places
 * Supports Unsplash, Pexels, and Wikimedia Commons
 */

interface ImageSource {
  id: string;
  url: string;
  thumbnail: string;
  author: string;
  authorUrl: string;
  source: 'unsplash' | 'pexels' | 'wikimedia';
  tags: string[];
  width: number;
  height: number;
}

// Search queries for different categories
const CATEGORY_QUERIES: Record<string, string[]> = {
  'tarihi-yerler': ['gobeklitepe', 'sanliurfa historical', 'urfa ancient', 'harran ruins'],
  'restoran': ['turkish kebab', 'sanliurfa food', 'urfa cuisine', 'lahmacun'],
  'cafe': ['turkish coffee', 'urfa cafe', 'tea house'],
  'otel': ['sanliurfa hotel', 'urfa accommodation'],
  'dini': ['sanliurfa mosque', 'balikligol', 'islamic architecture'],
  'dogal': ['sanliurfa nature', 'urfa landscape', 'anatolia'],
  'park': ['urfa park', 'turkish garden'],
  'muze': ['sanliurfa museum', 'archaeological museum'],
  'alisveris': ['urfa bazaar', 'turkish market', 'souq'],
  'eglence': ['urfa entertainment', 'turkish nightlife'],
};

/**
 * Search Unsplash
 */
async function searchUnsplash(
  query: string,
  perPage: number = 20,
  accessKey?: string
): Promise<ImageSource[]> {
  if (!accessKey) {
    console.warn('⚠️ Unsplash Access Key eksik. Unsplash atlanıyor.');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();

    return data.results.map((img: any) => ({
      id: `unsplash-${img.id}`,
      url: img.urls.regular,
      thumbnail: img.urls.small,
      author: img.user.name,
      authorUrl: img.user.links.html,
      source: 'unsplash' as const,
      tags: [],
      width: img.width,
      height: img.height,
    }));
  } catch (error) {
    console.error('Unsplash error:', error);
    return [];
  }
}

/**
 * Search Pexels
 */
async function searchPexels(
  query: string,
  perPage: number = 20,
  apiKey?: string
): Promise<ImageSource[]> {
  if (!apiKey) {
    console.warn('⚠️ Pexels API Key eksik. Pexels atlanıyor.');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();

    return data.photos.map((img: any) => ({
      id: `pexels-${img.id}`,
      url: img.src.large,
      thumbnail: img.src.medium,
      author: img.photographer,
      authorUrl: img.photographer_url,
      source: 'pexels' as const,
      tags: [],
      width: img.width,
      height: img.height,
    }));
  } catch (error) {
    console.error('Pexels error:', error);
    return [];
  }
}

/**
 * Search Wikimedia Commons
 */
async function searchWikimedia(query: string, limit: number = 20): Promise<ImageSource[]> {
  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&origin=*&srlimit=${limit}`
    );

    const data = await response.json();
    const images: ImageSource[] = [];

    for (const result of data.query.search) {
      const title = result.title.replace('File:', '');
      
      // Get image info
      const infoResponse = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|user&format=json&origin=*`
      );
      
      const infoData = await infoResponse.json();
      const pages = infoData.query.pages;
      const page = Object.values(pages)[0] as any;
      
      if (page.imageinfo && page.imageinfo[0]) {
        const info = page.imageinfo[0];
        images.push({
          id: `wikimedia-${title}`,
          url: info.url,
          thumbnail: info.url.replace('/commons/', '/commons/thumb/').replace(/\.([^\.]+)$/, '/800px-.$1'),
          author: info.user,
          authorUrl: `https://commons.wikimedia.org/wiki/User:${encodeURIComponent(info.user)}`,
          source: 'wikimedia' as const,
          tags: [],
          width: info.width,
          height: info.height,
        });
      }
    }

    return images;
  } catch (error) {
    console.error('Wikimedia error:', error);
    return [];
  }
}

/**
 * Search all sources
 */
export async function searchAllSources(
  query: string,
  options: {
    unsplashKey?: string;
    pexelsKey?: string;
    limit?: number;
  } = {}
): Promise<ImageSource[]> {
  const { unsplashKey, pexelsKey, limit = 20 } = options;

  console.log(`🔍 "${query}" için arama yapılıyor...`);

  const [unsplash, pexels, wikimedia] = await Promise.all([
    searchUnsplash(query, limit, unsplashKey),
    searchPexels(query, limit, pexelsKey),
    searchWikimedia(query, limit),
  ]);

  const all = [...unsplash, ...pexels, ...wikimedia];
  
  console.log(`  ✓ Unsplash: ${unsplash.length}`);
  console.log(`  ✓ Pexels: ${pexels.length}`);
  console.log(`  ✓ Wikimedia: ${wikimedia.length}`);
  console.log(`  📊 Toplam: ${all.length}\n`);

  return all;
}

/**
 * Download image
 */
export async function downloadImage(
  url: string,
  outputPath: string
): Promise<boolean> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, Buffer.from(buffer));
    
    return true;
  } catch (error) {
    console.error(`Download failed: ${url}`, error);
    return false;
  }
}

/**
 * Download and optimize image
 */
export async function downloadAndOptimize(
  image: ImageSource,
  outputDir: string,
  options: {
    width?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): Promise<string | null> {
  const { width = 1200, quality = 85, format = 'webp' } = options;
  
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Ensure directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  // Generate filename
  const sanitizedName = image.id.replace(/[^a-z0-9]/g, '-');
  const filename = `${sanitizedName}.${format}`;
  const filepath = path.join(outputDir, filename);
  
  try {
    // Try to use Sharp for optimization
    const sharp = await import('sharp').catch(() => null);
    
    if (sharp) {
      const response = await fetch(image.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      
      let transformer = sharp(buffer).resize(width, undefined, { 
        fit: 'inside',
        withoutEnlargement: true 
      });
      
      switch (format) {
        case 'webp':
          transformer = transformer.webp({ quality });
          break;
        case 'jpeg':
          transformer = transformer.jpeg({ quality });
          break;
        case 'png':
          transformer = transformer.png({ quality });
          break;
      }
      
      await transformer.toFile(filepath);
    } else {
      // Fallback: direct download
      await downloadImage(image.url, filepath);
    }
    
    // Save metadata
    const metadataPath = `${filepath}.json`;
    await fs.writeFile(
      metadataPath,
      JSON.stringify({
        ...image,
        localPath: filepath,
        downloadedAt: new Date().toISOString(),
      }, null, 2)
    );
    
    console.log(`  ✓ İndirildi: ${filename}`);
    return filepath;
  } catch (error) {
    console.error(`  ✗ Hata: ${filename}`, error);
    return null;
  }
}

/**
 * Download images for all categories
 */
export async function downloadCategoryImages(
  outputDir: string,
  options: {
    unsplashKey?: string;
    pexelsKey?: string;
    perCategory?: number;
  } = {}
): Promise<void> {
  const { unsplashKey, pexelsKey, perCategory = 10 } = options;
  
  console.log('🖼️  Kategori görselleri indiriliyor...\n');
  
  for (const [category, queries] of Object.entries(CATEGORY_QUERIES)) {
    console.log(`\n📁 ${category}`);
    
    const categoryDir = `${outputDir}/${category}`;
    
    for (const query of queries.slice(0, 2)) { // Limit to 2 queries per category
      const images = await searchAllSources(query, {
        unsplashKey,
        pexelsKey,
        limit: Math.ceil(perCategory / 2),
      });
      
      // Download first N images
      for (const image of images.slice(0, Math.ceil(perCategory / 2))) {
        await downloadAndOptimize(image, categoryDir);
        
        // Rate limiting
        await delay(500);
      }
    }
  }
}

/**
 * Search and download for specific place
 */
export async function downloadPlaceImages(
  placeName: string,
  category: string,
  outputDir: string,
  options: {
    unsplashKey?: string;
    pexelsKey?: string;
    count?: number;
  } = {}
): Promise<string[]> {
  const { unsplashKey, pexelsKey, count = 5 } = options;
  
  console.log(`\n📍 ${placeName} için görseller aranıyor...`);
  
  const query = `${placeName} sanliurfa`;
  const images = await searchAllSources(query, {
    unsplashKey,
    pexelsKey,
    limit: count * 2,
  });
  
  const placeDir = `${outputDir}/places/${slugify(placeName)}`;
  const downloaded: string[] = [];
  
  for (const image of images.slice(0, count)) {
    const path = await downloadAndOptimize(image, placeDir);
    if (path) downloaded.push(path);
    await delay(500);
  }
  
  return downloaded;
}

/**
 * Generate attribution file
 */
export async function generateAttributionFile(
  outputDir: string
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const attributions: string[] = [
    '# Görsel Atıfları\n',
    'Bu dosyada kullanılan tüm görsellerin atıf bilgileri bulunmaktadır.\n',
  ];
  
  // Find all metadata files
  async function scanDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.json')) {
        const metadata = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
        
        attributions.push(`## ${metadata.id}`);
        attributions.push(`- **Kaynak:** ${metadata.source}`);
        attributions.push(`- **Fotoğrafçı:** [${metadata.author}](${metadata.authorUrl})`);
        attributions.push(`- **Orijinal:** ${metadata.url}`);
        attributions.push('');
      }
    }
  }
  
  await scanDir(outputDir);
  
  await fs.writeFile(
    path.join(outputDir, 'ATTRIBUTIONS.md'),
    attributions.join('\n'),
    'utf-8'
  );
  
  console.log('📝 Atıf dosyası oluşturuldu: ATTRIBUTIONS.md');
}

/**
 * Utility: Delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility: Slugify
 */
function slugify(text: string): string {
  return text
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

// CLI usage
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;
  
  if (!unsplashKey && !pexelsKey) {
    console.log(`
⚠️  API Anahtarları Eksik!

Kullanım:
  UNSPLASH_ACCESS_KEY=xxx PEXELS_API_KEY=yyy bun run scripts/image-downloader.ts

API Anahtarları:
  - Unsplash: https://unsplash.com/developers
  - Pexels: https://www.pexels.com/api/

Wikimedia Commons API anahtarı gerektirmez.
    `);
  }
  
  if (args[0] === 'category') {
    downloadCategoryImages('./public/images/places', {
      unsplashKey,
      pexelsKey,
      perCategory: 10,
    }).then(() => {
      console.log('\n✅ Tamamlandı!');
    });
  } else if (args[0] === 'place' && args[1]) {
    downloadPlaceImages(args[1], args[2] || 'genel', './public/images', {
      unsplashKey,
      pexelsKey,
      count: 5,
    }).then(paths => {
      console.log(`\n✅ ${paths.length} görsel indirildi`);
    });
  } else {
    console.log(`
Kullanım:
  bun run scripts/image-downloader.ts category    # Tüm kategoriler için
  bun run scripts/image-downloader.ts place "Göbeklitepe" tarihi-yerler
    `);
  }
}
