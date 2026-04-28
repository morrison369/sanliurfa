import type { Migration } from '../lib/migrations';

/**
 * Migration 141: Seed DB-first homepage dynamic blocks
 */
export const migration_141_homepage_dynamic_blocks: Migration = {
  version: '141_homepage_dynamic_blocks',
  description:
    'Seed homepage.primaryActions, homepage.quickCategories, homepage.featuredGuides, homepage.faq',

  up: async (pool: any) => {
    await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, description)
      VALUES
      (
        'homepage.primaryActions',
        '{
          "items":[
            {"title":"Nöbetçi Eczaneler","description":"İlçe bazlı güncel nöbetçi eczane listesi.","href":"/saglik/nobetci-eczaneler","stat":"0+ eczane"},
            {"title":"Otobüs Saatleri","description":"Şehir içi otobüs saat ve hat bilgileri.","href":"/ulasim/otobus-saatleri","stat":"0+ hat"},
            {"title":"Uçak Saatleri","description":"GAP Havalimanı odaklı uçuş planlama rehberi.","href":"/ulasim/ucak-saatleri","stat":"Güncel uçuş rehberi"},
            {"title":"Etkinlik Takvimi","description":"Konser, festival ve yerel etkinlik akışı.","href":"/etkinlikler","stat":"0+ etkinlik"},
            {"title":"Yemek Tarifleri","description":"Şanlıurfa özel tarifler ve mutfak rehberi.","href":"/yemek-tarifleri","stat":"0+ öne çıkan"},
            {"title":"İlçeler Rehberi","description":"İlçe bazlı mekan ve yaşam içerikleri.","href":"/ilceler","stat":"0 merkez ilçe"},
            {"title":"Mekanlar Rehberi","description":"Kebapçılar, ciğerciler, kahvaltı ve daha fazlası.","href":"/mekanlar","stat":"0+ aktif mekan"}
          ]
        }'::jsonb,
        'Ana sayfa hizli erisim modulleri'
      ),
      (
        'homepage.quickCategories',
        '{
          "items":[
            {"slug":"kebapcilar","name":"Kebapçılar"},
            {"slug":"cigerciler","name":"Ciğerciler"},
            {"slug":"lahmacuncular","name":"Lahmacuncular"},
            {"slug":"pideciler","name":"Pideciler"},
            {"slug":"cig-kofteciler","name":"Çiğ Köfteciler"},
            {"slug":"yoresel-yemekler","name":"Yöresel Yemekler"},
            {"slug":"kahvalti-mekanlari","name":"Kahvaltı Mekanları"},
            {"slug":"tatlicilar","name":"Tatlıcılar"},
            {"slug":"kafeler","name":"Kafeler"},
            {"slug":"cay-bahceleri","name":"Çay Bahçeleri"},
            {"slug":"firinlar","name":"Fırınlar"},
            {"slug":"balik-restoranlari","name":"Balık Restoranları"}
          ]
        }'::jsonb,
        'Ana sayfa popüler kategori kutuları'
      ),
      (
        'homepage.featuredGuides',
        '{
          "items":[
            {"title":"Şanlıurfa Kebapçılar Rehberi","href":"/mekanlar/kebapcilar"},
            {"title":"Şanlıurfa Ciğerciler Rehberi","href":"/mekanlar/cigerciler"},
            {"title":"Şanlıurfa Kahvaltı Mekanları","href":"/mekanlar/kahvalti-mekanlari"},
            {"title":"Şanlıurfa Gezilecek Yerler","href":"/gezilecek-yerler"},
            {"title":"Şanlıurfa Otobüs Saatleri","href":"/ulasim/otobus-saatleri"},
            {"title":"Şanlıurfa Uçak Saatleri","href":"/ulasim/ucak-saatleri"},
            {"title":"Şanlıurfa Nöbetçi Eczaneler","href":"/saglik/nobetci-eczaneler"},
            {"title":"Şanlıurfa Topluluk Özellikleri","href":"/topluluk"}
          ]
        }'::jsonb,
        'Ana sayfa one cikan rehber linkleri'
      ),
      (
        'homepage.faq',
        '{
          "items":[
            {"q":"Şanlıurfa nöbetçi eczane listesi nereden öğrenilir?","a":"Güncel nöbetçi eczaneler için doğrudan /saglik/nobetci-eczaneler sayfasını kullanabilirsiniz."},
            {"q":"Şanlıurfa otobüs saatleri bu sitede var mı?","a":"Evet. /ulasim/otobus-saatleri sayfasında hat ve saat bilgilerine hızlıca erişebilirsiniz."},
            {"q":"Şanlıurfa uçak saatleri nereden takip edilir?","a":"GAP Havalimanı uçuş planlama rehberi için /ulasim/ucak-saatleri sayfasını kullanabilirsiniz."},
            {"q":"Şanlıurfa’da en iyi mekanlar nasıl bulunur?","a":"Mekanlar bölümünde kategori, ilçe ve puana göre filtreleyerek size uygun işletmeleri sıralayabilirsiniz."},
            {"q":"Şanlıurfa yemek tarifleri içerikleri mevcut mu?","a":"Evet. /yemek-tarifleri sayfasında Şanlıurfa mutfağına özel tarifler yayınlanmaktadır."}
          ]
        }'::jsonb,
        'Ana sayfa SSS bloğu'
      )
      ON CONFLICT (setting_key) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DELETE FROM site_settings
      WHERE setting_key IN (
        'homepage.primaryActions',
        'homepage.quickCategories',
        'homepage.featuredGuides',
        'homepage.faq'
      );
    `);
  },
};
