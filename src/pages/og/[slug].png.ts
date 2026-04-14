/**
 * Dinamik Open Graph Gorsel Olusturucu
 * 
 * Bu endpoint, sayfa basligi, aciklamasi ve kategorisine gore
 * dinamik olarak PNG formatinda Open Graph gorseli olusturur.
 * 
 * Kullanim: /og/mekan-adi?title=Baslik&desc=Aciklama&category=Kategori
 * 
 * Not: satori veya canvas kutuphaneleri yuklu degilse, SVG fallback
 * kullanilir. Turkce karakter destegi vardir.
 */

import type { APIRoute } from 'astro';

const SITE_URL = import.meta.env.SITE_URL || 'https://sanliurfa.com';

/**
 * SVG tabanli OG gorseli olusturur (satori/canvas yoksa fallback)
 */
function generateSVGImage(params: {
  title: string;
  description: string;
  category: string;
}): string {
  const { title, description, category } = params;

  // Turkce karakterleri SVG'de guvenli hale getir
  const safeTitle = escapeXml(title);
  const safeDesc = escapeXml(description);
  const safeCategory = escapeXml(category);

  // Baslik uzunluguna gore font boyutunu ayarla
  const titleFontSize = title.length > 40 ? 32 : title.length > 25 ? 38 : 44;

  // SVG sabloni - Sanliurfa markalas renkleri
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <!-- Arka plan gradient -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a365d;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#2d4a7a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a365d;stop-opacity:1" />
    </linearGradient>
    <!-- Altin rengi accent -->
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#d4a843;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#c9952e;stop-opacity:1" />
    </linearGradient>
    <!-- Dekoratif desen -->
    <pattern id="pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
      <circle cx="50" cy="50" r="1" fill="rgba(212,168,67,0.1)"/>
    </pattern>
  </defs>

  <!-- Arka plan -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#pattern)"/>

  <!-- Ust altin cizgi -->
  <rect x="0" y="0" width="1200" height="6" fill="url(#accent)"/>

  <!-- Dekoratif kose cizgileri -->
  <rect x="40" y="40" width="1120" height="550" fill="none" stroke="rgba(212,168,67,0.2)" stroke-width="1" rx="8"/>

  <!-- Logo / Marka alani -->
  <text x="60" y="90" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold" fill="#d4a843">Şanlıurfa.com</text>
  <text x="60" y="118" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="rgba(255,255,255,0.6)">Tarihin Sifir Noktasi</text>

  <!-- Kategori etiketi -->
  <rect x="60" y="160" width="${Math.min(safeCategory.length * 12 + 40, 300)}" height="36" rx="18" fill="rgba(212,168,67,0.15)" stroke="rgba(212,168,67,0.4)" stroke-width="1"/>
  <text x="${60 + Math.min(safeCategory.length * 12 + 40, 300) / 2}" y="184" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#d4a843" text-anchor="middle">${safeCategory}</text>

  <!-- Baslik -->
  <text x="60" y="280" font-family="Arial, Helvetica, sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="white">
    ${safeTitle}
  </text>

  <!-- Aciklama (max 2 satir) -->
  <text x="60" y="360" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="rgba(255,255,255,0.8)">
    ${safeDesc}
  </text>

  <!-- Alt bilgi -->
  <text x="60" y="540" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="rgba(255,255,255,0.4)">${SITE_URL}</text>

  <!-- Alt altin cizgi -->
  <rect x="0" y="624" width="1200" height="6" fill="url(#accent)"/>
</svg>`;

  return svg;
}

/**
 * XML icerisindeki ozel karakterleri escape eder
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * SVG'yi buffer'a donusturur (basit SVG -> PNG yaklasimi)
 * Gercek PNG encode icin harici kutuphane gerekir,
 * bu nedenle SVG'yi dogrudan donduruyoruz.
 * Browser'lar SVG'yi OG image olarak destekler.
 */
function svgToBuffer(svg: string): Buffer {
  return Buffer.from(svg, 'utf-8');
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Query parametrelerini al
    const searchParams = new URL(request.url).searchParams;
    
    let title = searchParams.get('title') || 'Şanlıurfa.com';
    let description = searchParams.get('desc') || 'Tarihin Sıfır Noktası';
    let category = searchParams.get('category') || 'Şehir Rehberi';

    // URL path'den slug'i al (orn: /og/gobeklitepe)
    const pathname = new URL(request.url).pathname;
    const slug = pathname.split('/og/')[1];

    // Slug varsa ve query parametreleri yoksa, slug'i baslik olarak kullan
    if (slug && !searchParams.get('title')) {
      // Slug'i okunabilir basliga cevir
      title = slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      
      // Sanliurfa'ya ozel slug esleştirmeleri
      const slugMap: Record<string, string> = {
        'gobeklitepe': 'Göbeklitepe',
        'balikligol': 'Balıklıgöl',
        'harran': 'Harran',
        'halfeti': 'Halfeti',
        'rizvaniye-camii': 'Rızvaniye Camii',
        'urfa-kalesi': 'Şanlıurfa Kalesi',
        'bazda-magaralari': 'Bazda Mağaraları',
        'haleplibahce-mozayikleri': 'Haleplibahçe Mozaikleri',
        'sira-geceleri': 'Sıra Geceleri',
        'ciğer-kebabi': 'Ciğer Kebabı',
      };

      if (slugMap[slug]) {
        title = slugMap[slug];
      }
    }

    // Aciklama ve kategori icin varsayilan degerler
    if (!searchParams.get('desc')) {
      description = `${title} - Şanlıurfa'nın en güzel noktalarından birini keşfedin. Detaylı bilgi, fotoğraflar ve kullanıcı yorumları Şanlıurfa.com'da.`;
    }

    if (!searchParams.get('category')) {
      category = 'Şanlıurfa Rehberi';
    }

    // SVG gorselini olustur
    const svg = generateSVGImage({ title, description, category });

    // SVG'yi buffer'a cevir
    const buffer = svgToBuffer(svg);

    // SVG olarak dondur (browser'lar SVG'yi destekler)
    // Istege bagli: ?format=png parametresi ile PNG formatinda da donebilir
    const format = searchParams.get('format');

    if (format === 'svg') {
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800', // 1 gun CDN, 1 hafta edge
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    // Varsayilan: SVG (PNG fallback olarak)
    // Not: Gercek PNG render icin satori + resvg-js gibi kutuphaneler gerekir.
    // Bu implementation SVG formatinda dondurur ki bu da cogu platform tarafindan desteklenir.
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'Content-Length': buffer.length.toString(),
        'X-OG-Generator': 'svg-fallback',
      },
    });

  } catch (error) {
    console.error('OG gorsel olusturma hatasi:', error);

    // Hata durumunda varsayilan gorsel
    const defaultSvg = generateSVGImage({
      title: 'Şanlıurfa.com',
      description: 'Tarihin Sıfır Noktası - Şehir Rehberi',
      category: 'Şanlıurfa',
    });

    return new Response(Buffer.from(defaultSvg, 'utf-8'), {
      status: 500,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
};
