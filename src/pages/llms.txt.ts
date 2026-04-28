import type { APIRoute } from 'astro';
import { getSiteBranding } from '../lib/site-branding';

export const GET: APIRoute = async () => {
  const { baseUrl, siteName } = await getSiteBranding();
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `# ${siteName} - LLM Discovery`,
    '# Dil: Türkçe (tek dil)',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    `Sitemap: ${baseUrl}/sitemap-dynamic.xml`,
    '',
    '> Sanliurfa.com, Şanlıurfa için Türkçe şehir rehberi, mekan keşfi, günlük servisler, yemek tarifleri, etkinlikler ve topluluk platformudur.',
    '',
    '## Ana Sayfalar',
    `- [Şanlıurfa şehir rehberi](${baseUrl}/): Şanlıurfa odaklı ana rehber, hızlı servisler ve keşif başlangıcı.`,
    `- [Şanlıurfa mekanları](${baseUrl}/mekanlar): Restoran, kafe, tarihi yer, otel ve yerel işletme rehberi.`,
    `- [Şanlıurfa ilçeleri](${baseUrl}/ilceler): İlçe bazlı keşif, mahalle ve yerel hizmet bağlantıları.`,
    `- [Şanlıurfa tarihi yerler](${baseUrl}/tarihi-yerler): Göbeklitepe, Balıklıgöl, Harran ve kültürel miras içerikleri.`,
    `- [Şanlıurfa yemek tarifleri](${baseUrl}/yemek-tarifleri): Urfa mutfağı, yöresel tarifler ve lezzet rehberi.`,
    '',
    '## Günlük Şehir Servisleri',
    `- [Şanlıurfa nöbetçi eczaneler](${baseUrl}/saglik/nobetci-eczaneler): İlçe bazlı güncel eczane bilgisi.`,
    `- [Şanlıurfa otobüs saatleri](${baseUrl}/ulasim/otobus-saatleri): Toplu taşıma ve şehir içi ulaşım rehberi.`,
    `- [Şanlıurfa uçak saatleri](${baseUrl}/ulasim/ucak-saatleri): GAP Havalimanı uçuş planlama rehberi.`,
    `- [Şanlıurfa etkinlikleri](${baseUrl}/etkinlikler): Kültür, sanat, festival ve şehir etkinlikleri.`,
    '',
    '## Topluluk',
    `- [Şanlıurfa topluluk](${baseUrl}/topluluk): Üyeler, paylaşımlar ve şehir içi sosyal keşif.`,
    `- [Şanlıurfa eşleşme](${baseUrl}/eslesme): Üyeler arası sosyal eşleşme ve mesajlaşma başlangıcı.`,
    `- [İşletme kayıt](${baseUrl}/isletme-kayit): Şanlıurfa işletmeleri için ücretsiz kayıt ve görünürlük.`,
    '',
    '## Önemli Varlıklar',
    `- [Göbeklitepe](${baseUrl}/isletme/gobeklitepe): Şanlıurfa’nın en önemli arkeolojik alanlarından biri.`,
    `- [Balıklıgöl](${baseUrl}/isletme/balikligol): Şanlıurfa merkezde tarihi ve dini ziyaret noktası.`,
    `- [Kapalı Çarşı](${baseUrl}/isletme/kapali-carsi): Şanlıurfa alışveriş ve yerel ürün deneyimi.`,
    '',
    '## AI Kullanım Notu',
    '- Site yalnızca Türkçedir; /en veya /tr dil prefix yapısı kullanılmaz.',
    '- Odak anahtar kelime: Şanlıurfa.',
    '- Günlük servis içerikleri admin onayı ve kaynak tazelik kontrolüyle yayınlanır.',
  ].join('\n');

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
