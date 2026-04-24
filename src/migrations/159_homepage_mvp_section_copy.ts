import type { Migration } from '../lib/migrations';

export const migration_159_homepage_mvp_section_copy: Migration = {
  version: '159_homepage_mvp_section_copy',
  description: 'Add DB-managed copy fields for homepage MVP quick start section',

  up: async (pool: any) => {
    await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, description)
      VALUES (
        'homepage.sectionCopy',
        '{
          "mvpQuickStartBadge":"MVP Hızlı Başlangıç",
          "mvpQuickStartTitle":"Şanlıurfa’da en çok kullanılan akışlar tek yerde",
          "mvpQuickStartDescription":"Siteyi kullanan kişi önce günlük servise, sonra mekan/gezi keşfine, ardından topluluk veya işletme başvurusuna hızlıca ulaşmalı.",
          "mvpQuickStartCtaLabel":"Tüm Şanlıurfa modülleri",
          "mvpQuickStartCtaHref":"/kesfet",
          "quickActionsTitle":"Hızlı Erişim Modülleri",
          "quickActionsDescription":"Şanlıurfa’da günlük ihtiyaçlar için tek tıkla erişim",
          "quickActionsCtaLabel":"Tüm modüller →",
          "liveStatusTitle":"Güncel Durum Merkezi",
          "liveStatusDescription":"Nöbetçi eczane, otobüs ve uçak servislerinin operasyonel görünümü",
          "liveStatusUpdatedPrefix":"Son güncelleme",
          "districtServiceTitle":"Konum ve İlçeye Göre Hızlı Başlangıç",
          "districtServiceDescription":"Yaşadığın veya gideceğin ilçeyi seç, servisleri ilçe odaklı başlat.",
          "districtServiceCtaLabel":"Tüm ilçe rehberi →",
          "popularCategoriesTitle":"Popüler Mekan Kategorileri",
          "popularCategoriesCtaLabel":"Mekan Rehberi →",
          "trendingTitle":"Bugün En Çok Arananlar",
          "trendingCtaLabel":"Aramaya Git →",
          "densityTitle":"Kategori Yoğunluk Haritası",
          "densityCtaLabel":"Kategoriler →",
          "districtsTitle":"İlçe Bazlı Şanlıurfa Rehberi",
          "districtsCtaLabel":"Tüm İlçeler →",
          "historicalSitesTitle":"Şanlıurfa Gezilecek Yerler",
          "historicalSitesCtaLabel":"Gezi Rehberi →",
          "featuredPlacesTitle":"Öne Çıkan Mekanlar",
          "featuredPlacesCtaLabel":"Tümü →",
          "recentPlacesTitle":"Yeni Eklenen Mekanlar",
          "audiencePlansTitle":"Şanlıurfa’yı amacına göre planla",
          "audiencePlansDescription":"Turist, aile, öğrenci ve yerel kullanıcı senaryoları için hazır keşif akışları.",
          "districtSpotlightsTitle":"İlçeye göre öne çıkan mekan kümeleri",
          "districtSpotlightsDescription":"Merkezden Halfeti’ye kadar öne çıkan yoğunlukları ve mekan kümelerini tek bakışta gör.",
          "districtSpotlightsCtaLabel":"İlçe sayfalarını aç →",
          "recentReviewsTitle":"Son yorumlanan mekanlar",
          "recentReviewsDescription":"Topluluğun son değerlendirdiği mekanları puan, kategori ve yorum özetiyle izle.",
          "trustSignalsTitle":"Son Güncellenen Mekanlar",
          "trustSignalsSubtitle":"Güven sinyali: canlı içerik güncelleme akışı",
          "guidesTitle":"Öne Çıkan Rehber Sayfaları",
          "mainCategoriesTitle":"Şanlıurfa Ana Kategoriler",
          "recipesTitle":"Şanlıurfa Özel Yemek Tarifleri",
          "recipesCtaLabel":"Tüm Tarifler →",
          "blogTitle":"Blogdan Son Yazılar",
          "blogCtaLabel":"Blog →",
          "faqTitle":"AEO ve GEO için hızlı cevap bölümü",
          "faqDescription":"Bu bölüm, kullanıcıların en sık sorduğu Şanlıurfa odaklı sorulara kısa ve net yanıtlar sunar."
        }'::jsonb,
        'Ana sayfa section başlık/açıklama/cta metinleri'
      )
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = site_settings.setting_value || '{
          "mvpQuickStartBadge":"MVP Hızlı Başlangıç",
          "mvpQuickStartTitle":"Şanlıurfa’da en çok kullanılan akışlar tek yerde",
          "mvpQuickStartDescription":"Siteyi kullanan kişi önce günlük servise, sonra mekan/gezi keşfine, ardından topluluk veya işletme başvurusuna hızlıca ulaşmalı.",
          "mvpQuickStartCtaLabel":"Tüm Şanlıurfa modülleri",
          "mvpQuickStartCtaHref":"/kesfet"
        }'::jsonb,
        description = COALESCE(site_settings.description, EXCLUDED.description),
        updated_at = NOW();
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      UPDATE site_settings
      SET setting_value = setting_value
        - 'mvpQuickStartBadge'
        - 'mvpQuickStartTitle'
        - 'mvpQuickStartDescription'
        - 'mvpQuickStartCtaLabel'
        - 'mvpQuickStartCtaHref',
        updated_at = NOW()
      WHERE setting_key = 'homepage.sectionCopy';
    `);
  },
};
