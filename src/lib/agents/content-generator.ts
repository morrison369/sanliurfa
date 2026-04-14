/**
 * AI Content Generator Agent
 * Automatically generates blog posts, place descriptions, and SEO content
 * Uses rule-based generation (no paid API required)
 */

export interface PlaceInfo {
  id: string;
  name: string;
  category: string;
  description?: string;
  features?: string[];
  location?: string;
  history?: string;
}

export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readingTime: number;
  image?: string;
}

// Content templates for different categories
const CATEGORY_TEMPLATES: Record<string, {
  intro: string[];
  features: string[];
  tips: string[];
  closing: string[];
}> = {
  'tarihi-yerler': {
    intro: [
      '{name}, Şanlıurfa\'nın en önemli tarihi miraslarından biri olarak ziyaretçilerini büyülemeye devam ediyor.',
      'Binlerce yıllık geçmişiyle {name}, medeniyetlerin beşiği Şanlıurfa\'da görülmesi gereken yerlerin başında geliyor.',
      'Tarihin derinliklerinden gelen {name}, size unutulmaz bir yolculuk vaat ediyor.'
    ],
    features: [
      'Tarihi yapıları ve mimari detaylarıyla dikkat çekiyor',
      'UNESCO Dünya Mirası Listesi\'nde yer alıyor',
      'Arkeolojik kazılarda ortaya çıkarılmış eşsiz eserler barındırıyor',
      'MÖ 10.000 yıllarına dayanan tarihi geçmişi var'
    ],
    tips: [
      'Rehberli turlarla daha detaylı bilgi alabilirsiniz',
      'Fotoğraf çekmek için erken saatleri tercih edin',
      'Müze kartı alarak tüm müzelere giriş yapabilirsiniz',
      'Yakındaki hediyelik eşya dükkanlarından alışveriş yapabilirsiniz'
    ],
    closing: [
      'Şanlıurfa\'ya yolunuz düşerse {name}\'yi mutlaka ziyaret edin.',
      '{name}, Şanlıurfa deneyiminizin vazgeçilmez bir parçası olacak.',
      'Tarihe tanıklık etmek için {name} sizi bekliyor.'
    ]
  },
  'restoran': {
    intro: [
      'Şanlıurfa mutfağının eşsiz lezzetlerini tatmak için {name} mükemmel bir adres.',
      'Geleneksel Urfa lezzetlerini modern sunumla birleştiren {name}, damak çatlatan tatlar sunuyor.',
      'Şanlıurfa\'da yemek deneyiminizi taçlandıracak {name}, yerel halkın da gözdesi.'
    ],
    features: [
      'Geleneksel odun ateşinde pişirme teknikleri kullanılıyor',
      'Yerel çiftliklerden taze malzemeler tedarik ediliyor',
      'Şıllık tatlısı ve künefe gibi tatlı çeşitleri mevcut',
      'Çocuklara özel menü seçenekleri sunuluyor'
    ],
    tips: [
      'Hafta sonları yoğun oluyor, rezervasyon yaptırmanız önerilir',
      'Ciğer kebabı ve lahmacun denemelisiniz',
      'Ayran ve şalgam içecekleri eşlikçi olarak tercih edilebilir',
      'Paket servis imkanından da yararlanabilirsiniz'
    ],
    closing: [
      '{name}, Şanlıurfa lezzet yolculuğunuzun duraklarından biri olmalı.',
      'Lezzet dolu anlar yaşamak için {name} sizi bekliyor.',
      'Gidenlerin tekrar tekrar uğradığı {name}\'yi deneyimleyin.'
    ]
  },
  'otel': {
    intro: [
      'Konaklama arayışınıza kaliteli çözümler sunan {name}, Şanlıurfa\'nın merkezi konumunda yer alıyor.',
      'Rahat ve konforlu bir konaklama deneyimi için {name} ideal bir tercih.',
      'Şanlıurfa\'nın tarihi dokusunu modern konforla birleştiren {name}, misafirlerini ağırlıyor.'
    ],
    features: [
      '7/24 resepsiyon ve oda servisi hizmeti',
      'Ücretsiz Wi-Fi ve klima',
      'Kahvaltı dahil konaklama seçenekleri',
      'Otopark imkanı sunuluyor'
    ],
    tips: [
      'Balıklıgöl ve çevresine yakın konumda',
      'Erken rezervasyon avantajlarından yararlanın',
      'Grup indirimleri için iletişime geçin',
      'Oda manzarası seçeneklerini sorgulayın'
    ],
    closing: [
      'Rahat bir konaklama için {name} tercih edebilirsiniz.',
      '{name}, Şanlıurfa ziyaretinizi konforlu kılacak.',
      'Memnuniyet garantili konaklama deneyimi {name}\'de sizi bekliyor.'
    ]
  },
  'cafe': {
    intro: [
      'Şanlıurfa\'nın hareketli atmosferinde dinlenmek için {name} ideal bir mola noktası.',
      'Keyifli sohbetler ve lezzetli içecekler için {name} tercih ediliyor.',
      'Çalışmak veya dinlenmek için rahat bir ortam arayanların adresi {name}.'
    ],
    features: [
      'Geniş kahve çeşitleri ve özel demleme seçenekleri',
      'Ev yapımı tatlılar ve atıştırmalıklar',
      'Rahat oturma alanları ve çalışma köşeleri',
      'Açık hava teras keyfi'
    ],
    tips: [
      'Türk kahvesi ve menengiç denemelisiniz',
      'Hafta sonları canlı müzik olabilir',
      'Ders çalışmak için sessiz saatleri tercih edin',
      'Kahvaltı tabağı önerilir'
    ],
    closing: [
      'Keyifli bir mola için {name}\'yi ziyaret edin.',
      '{name}, Şanlıurfa\'nın kahve kültürünü yansıtıyor.',
      'Rahatlayacağınız bir ortam {name}\'de sizi bekliyor.'
    ]
  }
};

// Blog post templates by type
const BLOG_TEMPLATES = {
  guide: {
    title: (topic: string) => [
      `Şanlıurfa'da ${topic}: 2025 Güncel Rehber`,
      `${topic} Rehberi - Şanlıurfa'da Mutlaka Görülmesi Gerekenler`,
      `Şanlıurfa ${topic} - En İyi Yerler ve Tavsiyeler`
    ],
    sections: ['Giriş', 'Nerede Kalınır?', 'Nasıl Gidilir?', 'En İyi Zaman', 'Tavsiyeler', 'Sonuç']
  },
  list: {
    title: (count: number, topic: string) => [
      `Şanlıurfa'da ${count} En İyi ${topic}`,
      `${topic} Arayanlara: Şanlıurfa'daki En İyi ${count} Adres`,
      `2025 Güncel: Şanlıurfa'da Mutlaka Uğranması Gereken ${count} ${topic}`
    ],
    sections: ['Giriş', 'Sıralama Kriterleri', 'Liste', 'Tavsiyeler', 'Sonuç']
  },
  food: {
    title: (dish: string) => [
      `Şanlıurfa'nın Meşhur ${dish}'si - Tarihçesi ve En İyi Adresler`,
      `${dish} Nerede Yenir? Şanlıurfa Lezzet Rehberi`,
      `Gerçek ${dish} Tadı İçin Şanlıurfa'ya Gidin!`
    ],
    sections: ['Tarihçe', 'Malzemeler', 'Yapılışı', 'Nerede Yenir?', 'Püf Noktaları']
  }
};

/**
 * Pick random element from array
 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate place description
 */
export function generatePlaceDescription(place: PlaceInfo): string {
  const templates = CATEGORY_TEMPLATES[place.category] || CATEGORY_TEMPLATES['tarihi-yerler'];
  
  const intro = pick(templates.intro).replace('{name}', place.name);
  const features = templates.features.slice(0, 3).map(f => `• ${f}`).join('\n');
  const tips = templates.tips.slice(0, 3).map(t => `• ${t}`).join('\n');
  const closing = pick(templates.closing).replace('{name}', place.name);
  
  return `${intro}

## Özellikler

${features}

## Ziyaret İpuçları

${tips}

## Son Söz

${closing}

---

**Adres:** ${place.location || 'Şanlıurfa Merkez'}
**Kategori:** ${place.category}
**Eklenme Tarihi:** ${new Date().toLocaleDateString('tr-TR')}
`;
}

/**
 * Generate blog post for a category
 */
export function generateCategoryBlogPost(
  category: string,
  places: PlaceInfo[],
  postType: 'guide' | 'list' | 'food' = 'guide'
): BlogPost {
  const templates = BLOG_TEMPLATES[postType];
  const title = pick(templates.title(places.length, category));
  const slug = slugify(title);
  
  const now = new Date();
  const publishedAt = now.toISOString();
  
  // Generate content sections
  const sections: string[] = [];
  
  // Intro
  sections.push(`# ${title}\n`);
  sections.push(`${category} kategorisinde Şanlıurfa'da görülmesi gereken en önemli yerleri sizin için derledik. Bu rehber, 2025 yılı güncel bilgileriyle hazırlanmıştır.\n`);
  
  // Places list
  sections.push(`## ${category} Listesi\n`);
  places.forEach((place, index) => {
    sections.push(`### ${index + 1}. ${place.name}\n`);
    sections.push(`${place.description || `${place.name}, Şanlıurfa'nın önemli ${category} mekanlarından biridir.`}\n`);
    if (place.features) {
      sections.push('**Öne Çıkanlar:**\n');
      place.features.forEach(f => sections.push(`- ${f}`));
      sections.push('\n');
    }
  });
  
  // Tips section
  sections.push(`## Ziyaret Tavsiyeleri\n`);
  sections.push(`- ${category} ziyaretinizi hafta içi planlayarak kalabalıktan kaçınabilirsiniz\n`);
  sections.push(`- Yerel rehberler eşliğinde daha detaylı bilgi alabilirsiniz\n`);
  sections.push(`- Yakındaki diğer mekanları da rotanıza ekleyebilirsiniz\n`);
  
  // Closing
  sections.push(`## Sonuç\n`);
  sections.push(`Şanlıurfa'da ${category} deneyimi yaşamak için bu rehberi kullanabilirsiniz. Daha fazla bilgi için sitemizi takip etmeye devam edin.\n`);
  
  const content = sections.join('\n');
  const readingTime = Math.ceil(content.length / 1000);
  
  return {
    title,
    slug,
    excerpt: `Şanlıurfa'da ${category} kategorisinde ${places.length} mekan hakkında detaylı bilgi ve tavsiyeler.`,
    content,
    category,
    tags: ['şanlıurfa', category, 'rehber', '2025'],
    author: 'Şanlıurfa Rehberi Botu',
    publishedAt,
    readingTime,
    image: `/images/${category}.jpg`
  };
}

/**
 * Generate SEO meta description
 */
export function generateMetaDescription(title: string, category: string): string {
  const templates = [
    `${title} - Şanlıurfa'da ${category} kategorisinde en iyi adresler. 2025 güncel bilgiler ve tavsiyeler.`,
    `Şanlıurfa ${title} hakkında detaylı bilgi. ${category} mekanları, ulaşım ve ziyaret ipuçları.`,
    `${title} rehberi. Şanlıurfa'da ${category} deneyimi yaşamak için bilmeniz gerekenler.`
  ];
  return pick(templates);
}

/**
 * Generate FAQ section
 */
export function generateFAQ(topic: string): string {
  return `## Sıkça Sorulan Sorular

### ${topic} giriş ücretli mi?
Bazı mekanlar ücretsiz, bazıları ise sembolik bir giriş ücreti talep ediyor. Güncel fiyatlar için mekanın resmi sitesini kontrol edin.

### En iyi ziyaret zamanı ne zaman?
İlkbahar (Mart-Mayıs) ve sonbahar (Eylül-Kasım) ayları en ideal dönemlerdir.

### Otopark var mı?
Çoğu mekanda ücretsiz veya ücretli otopark imkanı bulunmaktadır.

### Rehberli tur var mı?
Evet, birçok mekanda profesyonel rehberli tur seçenekleri mevcuttur.

### Fotoğraf çekmek serbest mi?
Genellikle evet, ancak bazı özel alanlarda kısıtlama olabilir.
`;
}

/**
 * Generate markdown file from blog post
 */
export function generateMarkdown(post: BlogPost): string {
  return `---
title: "${post.title}"
slug: "${post.slug}"
excerpt: "${post.excerpt}"
category: "${post.category}"
tags: [${post.tags.map(t => `"${t}"`).join(', ')}]
author: "${post.author}"
publishedAt: "${post.publishedAt}"
readingTime: ${post.readingTime}
image: "${post.image}"
---

${post.content}
`;
}

/**
 * Create slug from title
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

/**
 * Batch generate content for all places
 */
export function batchGeneratePlaceContent(places: PlaceInfo[]): Map<string, string> {
  const content = new Map<string, string>();
  
  places.forEach(place => {
    const description = generatePlaceDescription(place);
    content.set(place.id, description);
  });
  
  return content;
}

/**
 * Generate weekly content plan
 */
export function generateWeeklyContentPlan(): string[] {
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const topics = [
    'Tarihi Yerler Rehberi',
    'En İyi Restoranlar',
    'Konaklama Tavsiyeleri',
    'Kafe ve Dinlenme Noktaları',
    'Alışveriş Rehberi',
    'Hafta Sonu Rotaları',
    'Yerel Lezzetler'
  ];
  
  return days.map((day, index) => `${day}: ${topics[index]}`);
}

// Export all functions
export default {
  generatePlaceDescription,
  generateCategoryBlogPost,
  generateMetaDescription,
  generateFAQ,
  generateMarkdown,
  batchGeneratePlaceContent,
  generateWeeklyContentPlan
};
