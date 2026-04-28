#!/usr/bin/env python3
"""SEO Meta Tag'leri Kurulumu"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("🔍 SEO Meta Tag'leri Kurulumu")
    print("=" * 70)

    # 1. SEO Component'i
    print("\n1️⃣ SEO Component'i oluşturuluyor...")
    
    seo_component = '''---
export interface Props {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'place';
  canonical?: string;
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];
}

const {
  title = 'Şanlıurfa.com - Tarihin Sıfır Noktası',
  description = 'Şanlıurfa şehir rehberi. Göbeklitepe, Balıklıgöl ve daha fazlasını keşfedin.',
  image = '/images/og-default.jpg',
  type = 'website',
  canonical,
  noindex = false,
  publishedTime,
  modifiedTime,
  author,
  tags
} = Astro.props;

const siteUrl = 'https://sanliurfa.com';
const canonicalUrl = canonical || Astro.url.href;
const ogImage = image.startsWith('http') ? image : `${siteUrl}${image}`;
---

<!-- Temel Meta Tag'leri -->
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content={description} />
<meta name="keywords" content={tags?.join(', ') || 'Şanlıurfa, Göbeklitepe, Balıklıgöl, turizm, gezi, tarih'} />
<meta name="author" content={author || 'Şanlıurfa.com'} />
<meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
<meta name="googlebot" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

<!-- Canonical URL -->
<link rel="canonical" href={canonicalUrl} />

<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="manifest" href="/site.webmanifest" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content={type} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={ogImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content={title} />
<meta property="og:site_name" content="Şanlıurfa.com" />
<meta property="og:locale" content="tr_TR" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content={canonicalUrl} />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImage} />
<meta name="twitter:image:alt" content={title} />

<!-- Article specific (eğer article tipi ise) -->
{type === 'article' && (
  <>
    <meta property="article:published_time" content={publishedTime} />
    {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
    {author && <meta property="article:author" content={author} />}
    {tags?.map(tag => <meta property="article:tag" content={tag} />)}
  </>
)}

<!-- Place specific (eğer place tipi ise) -->
{type === 'place' && (
  <>
    <meta property="place:location:latitude" content="37.1591" />
    <meta property="place:location:longitude" content="38.7969" />
  </>
)}

<!-- Theme Color -->
<meta name="theme-color" content="#a18072" />
<meta name="msapplication-TileColor" content="#a18072" />

<!-- Geo Tags -->
<meta name="geo.region" content="TR-63" />
<meta name="geo.placename" content="Şanlıurfa" />
<meta name="geo.position" content="37.1591;38.7969" />
<meta name="ICBM" content="37.1591, 38.7969" />

<!-- Mobile App Capable -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Şanlıurfa" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

<!-- Preconnect for performance -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preconnect" href="https://www.google-analytics.com" />
<link rel="dns-prefetch" href="https://www.google-analytics.com" />

<!-- Title -->
<title>{title}</title>
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(seo_component.encode()), 
               '/home/sanliur/public_html/src/components/SEO.astro')
    sftp.close()
    print("   ✅ SEO.astro component'i oluşturuldu")

    # 2. Schema.org JSON-LD Component
    print("\n2️⃣ Schema.org JSON-LD oluşturuluyor...")
    
    schema_component = '''---
export interface Props {
  type: 'WebSite' | 'WebPage' | 'Article' | 'Place' | 'Restaurant' | 'TouristAttraction';
  data: any;
}

const { type, data } = Astro.props;

// Schema templates
const schemas: Record<string, any> = {
  WebSite: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: data.name || 'Şanlıurfa.com',
    url: data.url || 'https://sanliurfa.com',
    description: data.description || 'Şanlıurfa şehir rehberi',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://sanliurfa.com/arama?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  },
  
  WebPage: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: data.title,
    description: data.description,
    url: data.url,
    image: data.image,
    datePublished: data.publishedTime,
    dateModified: data.modifiedTime,
    author: {
      '@type': 'Organization',
      name: data.author || 'Şanlıurfa.com'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Şanlıurfa.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sanliurfa.com/logo.png'
      }
    }
  },
  
  Article: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    image: data.image,
    datePublished: data.publishedTime,
    dateModified: data.modifiedTime,
    author: {
      '@type': 'Person',
      name: data.author
    },
    publisher: {
      '@type': 'Organization',
      name: 'Şanlıurfa.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sanliurfa.com/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': data.url
    }
  },
  
  Place: {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: data.name,
    description: data.description,
    image: data.image,
    address: {
      '@type': 'PostalAddress',
      addressLocality: data.city || 'Şanlıurfa',
      addressCountry: 'TR'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: data.latitude,
      longitude: data.longitude
    },
    telephone: data.phone,
    url: data.url
  },
  
  TouristAttraction: {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: data.name,
    description: data.description,
    image: data.image,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: data.latitude,
      longitude: data.longitude
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Şanlıurfa',
      addressCountry: 'TR'
    },
    touristType: ['Tarih meraklıları', 'Kültür turistleri', 'Aileler']
  }
};

const schema = schemas[type] || schemas.WebPage;

// Override with custom data
Object.assign(schema, data);
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(schema_component.encode()), 
               '/home/sanliur/public_html/src/components/SchemaOrg.astro')
    sftp.close()
    print("   ✅ SchemaOrg.astro component'i oluşturuldu")

    # 3. Güncellenmiş Layout
    print("\n3️⃣ Layout.astro güncelleniyor...")
    
    layout = '''---
import SEO from '../components/SEO.astro';
import SchemaOrg from '../components/SchemaOrg.astro';
import { getPublicSettings } from '../lib/settings';

export interface Props {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'place';
  canonical?: string;
  noindex?: boolean;
  schema?: {
    type: 'WebSite' | 'WebPage' | 'Article' | 'Place' | 'TouristAttraction';
    data: any;
  };
}

const props = Astro.props;

// Settings'i al
detect() {
  const settings = await getPublicSettings();
  return {
    props: {
      settings
    }
  };
}

const { settings } = Astro.props;
---

<!DOCTYPE html>
<html lang="tr" dir="ltr">
<head>
  <SEO 
    title={props.title || settings?.site_name}
    description={props.description || settings?.site_description}
    image={props.image || settings?.og_image}
    type={props.type}
    canonical={props.canonical}
    noindex={props.noindex}
    publishedTime={props.schema?.data?.publishedTime}
    modifiedTime={props.schema?.data?.modifiedTime}
    author={props.schema?.data?.author}
    tags={props.schema?.data?.tags}
  />
  
  {props.schema && (
    <SchemaOrg 
      type={props.schema.type} 
      data={props.schema.data} 
    />
  )}
  
  <!-- Google Analytics -->
  {settings?.ga_tracking_id && (
    <script async src={`https://www.googletagmanager.com/gtag/js?id=${settings.ga_tracking_id}`}></script>
    <script define:vars={{ GA_ID: settings.ga_tracking_id }}>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', GA_ID);
    </script>
  )}
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <slot name="head" />
</head>
<body class="font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <!-- Skip to content link (Accessibility) -->
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-urfa-600 text-white px-4 py-2 rounded z-50">
    Ana içeriğe git
  </a>
  
  <slot />
  
  <!-- Back to top button -->
  <button 
    id="back-to-top"
    class="fixed bottom-8 right-8 bg-urfa-600 text-white p-3 rounded-full shadow-lg opacity-0 invisible transition-all duration-300 hover:bg-urfa-700 focus:outline-none focus:ring-2 focus:ring-urfa-500 z-40"
    aria-label="Yukarı çık"
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
    </svg>
  </button>
  
  <script>
    // Back to top functionality
    const backToTopButton = document.getElementById('back-to-top');
    
    if (backToTopButton) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
          backToTopButton.classList.remove('opacity-0', 'invisible');
          backToTopButton.classList.add('opacity-100', 'visible');
        } else {
          backToTopButton.classList.add('opacity-0', 'invisible');
          backToTopButton.classList.remove('opacity-100', 'visible');
        }
      });
      
      backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  </script>
</body>
</html>
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(layout.encode()), 
               '/home/sanliur/public_html/src/layouts/Layout.astro')
    sftp.close()
    print("   ✅ Layout.astro güncellendi")

    # 4. robots.txt güncelleme
    print("\n4️⃣ robots.txt oluşturuluyor...")
    
    robots_txt = '''User-agent: *
Allow: /

# Sitemap
Sitemap: https://sanliurfa.com/sitemap-index.xml

# Crawl-delay
Crawl-delay: 1

# Engellenen dizinler
Disallow: /admin/
Disallow: /api/
Disallow: /giris/
Disallow: /kayit/
Disallow: /sifre-sifirla/
Disallow: /profil/

# Googlebot
User-agent: Googlebot
Allow: /
Crawl-delay: 0.5

# Bingbot
User-agent: Bingbot
Allow: /
Crawl-delay: 0.5
'''

    # public klasörüne yaz
    try:
        sftp.mkdir('/home/sanliur/public_html/public')
    except:
        pass
    
    sftp.putfo(__import__('io').BytesIO(robots_txt.encode()), 
               '/home/sanliur/public_html/public/robots.txt')
    sftp.close()
    print("   ✅ robots.txt oluşturuldu")

    # 5. site.webmanifest
    print("\n5️⃣ site.webmanifest oluşturuluyor...")
    
    webmanifest = '''{
  "name": "Şanlıurfa.com - Tarihin Sıfır Noktası",
  "short_name": "Şanlıurfa",
  "description": "Şanlıurfa şehir rehberi. Göbeklitepe, Balıklıgöl ve daha fazlası.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fdf8f6",
  "theme_color": "#a18072",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "tr",
  "icons": [
    {
      "src": "/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["travel", "lifestyle", "education"],
  "screenshots": [
    {
      "src": "/screenshot-1.jpg",
      "sizes": "1280x720",
      "type": "image/jpeg"
    }
  ],
  "related_applications": [],
  "prefer_related_applications": false
}
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(webmanifest.encode()), 
               '/home/sanliur/public_html/public/site.webmanifest')
    sftp.close()
    print("   ✅ site.webmanifest oluşturuldu")

    ssh.close()

    print("\n" + "=" * 70)
    print("✅ SEO KURULUMU TAMAMLANDI")
    print("=" * 70)
    print("""
📋 Oluşturulan Dosyalar:
  📁 /src/components/SEO.astro
  📁 /src/components/SchemaOrg.astro
  📁 /src/layouts/Layout.astro
  📁 /public/robots.txt
  📁 /public/site.webmanifest

🔍 SEO Özellikleri:
  ✅ Meta tag'leri (title, description, keywords)
  ✅ Open Graph (Facebook, LinkedIn)
  ✅ Twitter Card
  ✅ Canonical URL
  ✅ Schema.org JSON-LD
  ✅ robots.txt
  ✅ Web App Manifest
  ✅ Favicon seti
  ✅ Geo tags (Şanlıurfa koordinatları)
  ✅ Preconnect for performance

📝 Kullanım:
  <Layout 
    title="Sayfa Başlığı"
    description="Sayfa açıklaması"
    image="/gorsel.jpg"
    type="article"
    schema={{
      type: 'Article',
      data: { title, description, publishedTime, author }
    }}
  >
    <slot />
  </Layout>

⚠️  ÖNEMLİ:
  - Görseller public klasörüne eklenmeli
  - OG görseli: 1200x630px önerilir
  - Rebuild: npm run build && pm2 restart sanliurfa
""")

if __name__ == "__main__":
    main()
