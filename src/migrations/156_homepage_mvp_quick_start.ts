import type { Migration } from '../lib/migrations';

export const migration_156_homepage_mvp_quick_start: Migration = {
  version: '156_homepage_mvp_quick_start',
  description: 'Seed homepage.mvpQuickStart for DB-first MVP quick start cards',

  up: async (pool: any) => {
    await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, description)
      VALUES (
        'homepage.mvpQuickStart',
        '{
          "items":[
            {
              "badge":"Günlük İhtiyaç",
              "title":"Nöbetçi eczane, otobüs ve uçak saatleri",
              "description":"Şanlıurfa’da bugün ihtiyacın olan servisleri tek ekrandan aç.",
              "href":"/kesfet",
              "links":[
                {"href":"/saglik/nobetci-eczaneler","label":"Nöbetçi Eczane"},
                {"href":"/ulasim/otobus-saatleri","label":"Otobüs Saatleri"},
                {"href":"/ulasim/ucak-saatleri","label":"Uçak Saatleri"}
              ]
            },
            {
              "badge":"Keşif",
              "title":"Mekan, gezi rotası ve yemek tarifleri",
              "description":"Kebapçılar, tarihi yerler, ilçeler ve Şanlıurfa tariflerini hızlı başlat.",
              "href":"/mekanlar",
              "links":[
                {"href":"/mekanlar/kebapcilar","label":"Kebapçılar"},
                {"href":"/gezilecek-yerler","label":"Gezilecek Yerler"},
                {"href":"/yemek-tarifleri","label":"Yemek Tarifleri"}
              ]
            },
            {
              "badge":"Topluluk",
              "title":"Ücretsiz sosyal özellikler ve işletme başvurusu",
              "description":"Mesajlaşma, eşleşme, takip ve işletme ekleme ilk aşamada açık.",
              "href":"/topluluk",
              "links":[
                {"href":"/topluluk","label":"Topluluk"},
                {"href":"/eslesme","label":"Eşleşme"},
                {"href":"/isletme-kayit","label":"İşletme Ekle"}
              ]
            }
          ]
        }'::jsonb,
        'Ana sayfa MVP hızlı başlangıç kartları'
      )
      ON CONFLICT (setting_key) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DELETE FROM site_settings
      WHERE setting_key = 'homepage.mvpQuickStart';
    `);
  },
};
