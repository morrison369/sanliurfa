/**
 * Content Generation Bot API
 * Automatically generates blog posts using AI rules
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { query, queryOne } from '../../../../lib/postgres';
import { createPost } from '../../../../lib/blog/db';
import { problemJson } from '../../../../lib/api';

// Content templates
const CONTENT_TEMPLATES = {
  'tarihi-yerler': {
    intro: [
      '{name}, Şanlıurfa\'nın en önemli tarihi miraslarından biri olarak ziyaretçilerini büyülemeye devam ediyor.',
      'Binlerce yıllık geçmişiyle {name}, medeniyetlerin beşiği Şanlıurfa\'da görülmesi gereken yerlerin başında geliyor.',
    ],
    sections: ['Tarihçe', 'Mimari Özellikler', 'Ziyaret Bilgileri', 'Nasıl Gidilir?', 'Tavsiyeler'],
  },
  'restoran': {
    intro: [
      'Şanlıurfa mutfağının eşsiz lezzetlerini tatmak için {name} mükemmel bir adres.',
      'Geleneksel Urfa lezzetlerini modern sunumla birleştiren {name}, damak çatlatan tatlar sunuyor.',
    ],
    sections: ['Menü', 'Öne Çıkan Lezzetler', 'Fiyat Aralığı', 'Çalışma Saatleri', 'Konum'],
  },
  'otel': {
    intro: [
      'Konaklama arayışınıza kaliteli çözümler sunan {name}, Şanlıurfa\'nın merkezi konumunda yer alıyor.',
      'Rahat ve konforlu bir konaklama deneyimi için {name} ideal bir tercih.',
    ],
    sections: ['Oda Seçenekleri', 'Olanaklar', 'Fiyatlar', 'Rezervasyon', 'Ulaşım'],
  },
};

/**
 * Generate content for a place
 */
function generatePlaceContent(place: any): { title: string; content: string; excerpt: string } {
  const template = CONTENT_TEMPLATES[place.category as keyof typeof CONTENT_TEMPLATES] || CONTENT_TEMPLATES['tarihi-yerler'];
  const intro = template.intro[Math.floor(Math.random() * template.intro.length)].replace('{name}', place.name);
  
  const sections = template.sections.map(section => {
    return `## ${section}

${generateSectionContent(section)}
`;
  }).join('\n');

  const content = `${intro}

${sections}

## Sonuç

${place.name}, Şanlıurfa ziyaretinizde mutlaka uğramanız gereken yerlerden biri. Unutulmaz deneyimler için bu mekanı listenize ekleyin.

---

**Adres:** ${place.address || 'Şanlıurfa'}  
**Telefon:** ${place.phone || 'Belirtilmemiş'}  
**Web:** ${place.website || 'Belirtilmemiş'}
`;

  return {
    title: `${place.name} - Şanlıurfa Rehberi`,
    content,
    excerpt: `${place.name} hakkında detaylı bilgi, ziyaret saatleri ve tavsiyeler.`,
  };
}

function generateSectionContent(section: string): string {
  const contents: Record<string, string[]> = {
    'Tarihçe': [
      'Bu mekan, binlerce yıllık geçmişiyle Şanlıurfa\'nın en önemli tarihi yapılarından biridir.',
      'Tarihi kaynaklarda ilk defa MS 3. yüzyılda bahsedilen bu yapı, birçok medeniyete ev sahipliği yapmıştır.',
      'Arkeolojik kazılarda ortaya çıkarılan bulgular, buranın ne kadar eski olduğunu göstermektedir.',
    ],
    'Mimari Özellikler': [
      'Geleneksel Şanlıurfa mimarisinin en güzel örneklerinden biri olarak dikkat çeker.',
      'Taş işçiliği ve süslemeleriyle göz kamaştıran bu yapı, ustaların ustalığını gözler önüne serer.',
      'Restore edilmiş bölümler orijinal dokuyu korumaktadır.',
    ],
    'Ziyaret Bilgileri': [
      'Giriş ücretsizdir.',
      'Rehberli tur almak isteyenler için girişte bilgi verilmektedir.',
      'Fotoğraf çekmek serbesttir.',
    ],
    'Nasıl Gidilir?': [
      'Şehir merkezine 15 dakika mesafededir.',
      'Toplu taşıma ile ulaşım mümkündür.',
      'Otopark imkanı mevcuttur.',
    ],
    'Tavsiyeler': [
      'Erken saatlerde ziyaret ederek kalabalıktan kaçının.',
      'Yakındaki diğer tarihi mekanları da geziyi uzatabilirsiniz.',
      'Yerel rehberlerden bilgi almanız önerilir.',
    ],
    'Menü': [
      'Geleneksel Urfa mutfağından seçkin lezzetler sunulmaktadır.',
      'Ciğer kebabı, lahmacun ve çiğ köfte öne çıkan tatlardır.',
      'Günlük taze malzemeler kullanılmaktadır.',
    ],
    'Öne Çıkan Lezzetler': [
      'Ciğer Kebabı: Meşhur Urfa ciğeri',
      'Lahmacun: Fındık lahmacun',
      'Çiğ Köfte: Efsane lezzet',
    ],
    'Fiyat Aralığı': [
      'Ortalama fiyatlar uygun seviyededir.',
      'Kişi başı 200-400 TL arası değişmektedir.',
    ],
    'Oda Seçenekleri': [
      'Standart, deluxe ve suit oda seçenekleri mevcuttur.',
      'Tüm odalarda klima, Wi-Fi ve mini bar bulunmaktadır.',
    ],
    'Olanaklar': [
      'Ücretsiz Wi-Fi ve otopark',
      '7/24 resepsiyon hizmeti',
      'Kahvaltı dahil konaklama',
    ],
  };

  const options = contents[section] || ['Detaylı bilgi için mekanı ziyaret edebilirsiniz.'];
  return options[Math.floor(Math.random() * options.length)];
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-content-bot-unauthorized',
        instance: '/api/admin/content-bot/generate',
      });
    }

    const body = await request.json();
    const { type, category, placeIds } = body;

    if (type === 'places') {
      // Generate content for specific places
      const places = await query(
        'SELECT * FROM places WHERE id = ANY($1)',
        [placeIds]
      );

      const generated = [];
      for (const place of places.rows) {
        const { title, content, excerpt } = generatePlaceContent(place);
        
        // Create slug
        const slug = place.name
          .toLowerCase()
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ı/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        // Check if post exists
        const existing = await queryOne(
          'SELECT id FROM blog_posts WHERE slug = $1',
          [slug]
        );

        if (existing) {
          generated.push({ place: place.name, status: 'skipped', reason: 'Already exists' });
          continue;
        }

        // Get category id
        const catResult = await queryOne(
          'SELECT id FROM blog_categories WHERE slug = $1',
          [place.category === 'tarihi-yerler' ? 'tarih' : place.category]
        );

        // Create post
        const post = await createPost({
          title,
          slug,
          excerpt,
          content,
          category_id: catResult?.id,
          author_id: auth.user.id,
          author_name: 'Content Bot',
          status: 'draft',
        });

        generated.push({ place: place.name, status: 'created', postId: post.id });
      }

      return new Response(JSON.stringify({ success: true, generated }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (type === 'category-guide') {
      // Generate category guide
      const places = await query(
        'SELECT * FROM places WHERE category = $1 LIMIT 10',
        [category]
      );

      const title = `Şanlıurfa’da ${places.rows.length} En İyi ${category}`;
      const slug = `en-iyi-${category}-sanliurfa`;

      let content = `# ${title}\n\n`;
      content += `${category} kategorisinde Şanlıurfa’da görülmesi gereken yerleri sizin için derledik.\n\n`;

      places.rows.forEach((place: any, index: number) => {
        content += `## ${index + 1}. ${place.name}\n\n`;
        content += `${place.description || `${place.name} hakkında bilgi.`}\n\n`;
        content += `**Adres:** ${place.address || 'Şanlıurfa'}\n\n`;
      });

      content += `\n## Sonuç\n\n`;
      content += `Şanlıurfa’da ${category} deneyimi yaşamak için bu rehberi kullanabilirsiniz.\n`;

      const post = await createPost({
        title,
        slug,
        excerpt: `Şanlıurfa’da ${category} kategorisinde ${places.rows.length} mekan hakkında detaylı bilgi.`,
        content,
        category_id: (await queryOne('SELECT id FROM blog_categories WHERE slug = $1', [category === 'restoran' ? 'yemek' : 'gezi']))?.id,
        author_id: auth.user.id,
        author_name: 'Content Bot',
        status: 'draft',
        is_featured: true,
      });

      return new Response(JSON.stringify({ 
        success: true, 
        post: { id: post.id, title: post.title, slug: post.slug }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Geçersiz type. places veya category-guide kullanın',
      type: '/problems/admin-content-bot-validation',
      instance: '/api/admin/content-bot/generate',
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'İçerik Üretimi Başarısız',
      detail: error instanceof Error ? error.message : 'Generation failed',
      type: '/problems/admin-content-bot-failed',
      instance: '/api/admin/content-bot/generate',
    });
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-content-bot-unauthorized',
        instance: '/api/admin/content-bot/generate',
      });
    }

    // Get generation jobs
    const jobs = await query(
      `SELECT * FROM content_generation_jobs 
       ORDER BY created_at DESC 
       LIMIT 20`
    );

    // Get available categories
    const categories = await query(
      `SELECT DISTINCT category FROM places WHERE category IS NOT NULL`
    );

    // Get places without blog posts
    const placesWithoutContent = await query(
      `SELECT p.id, p.name, p.category 
       FROM places p
       LEFT JOIN blog_posts bp ON bp.slug = LOWER(REGEXP_REPLACE(p.name, '[^a-zA-Z0-9]', '-', 'g'))
       WHERE bp.id IS NULL
       LIMIT 50`
    );

    return new Response(JSON.stringify({
      jobs: jobs.rows,
      categories: categories.rows.map((r: any) => r.category),
      placesWithoutContent: placesWithoutContent.rows,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'İçerik Bot Verileri Alınamadı',
      detail: error instanceof Error ? error.message : 'Failed to get data',
      type: '/problems/admin-content-bot-get-failed',
      instance: '/api/admin/content-bot/generate',
    });
  }
};
