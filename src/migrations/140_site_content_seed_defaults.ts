import type { Migration } from '../lib/migrations';

/**
 * Migration 140: Seed DB-first defaults for header/footer/cta settings
 */
export const migration_140_site_content_seed_defaults: Migration = {
  version: '140_site_content_seed_defaults',
  description: 'Seed header.utilityLinks, footer.links, homepage.mainCta defaults',

  up: async (pool: any) => {
    await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, description)
      VALUES
      (
        'header.utilityLinks',
        '{
          "items": [
            {"href":"/saglik/nobetci-eczaneler","label":"Nöbetçi Eczaneler"},
            {"href":"/ulasim/otobus-saatleri","label":"Otobüs Saatleri"},
            {"href":"/ulasim/ucak-saatleri","label":"Uçak Saatleri"},
            {"href":"/topluluk","label":"Topluluk"},
            {"href":"/eslesme","label":"Eşleşme"},
            {"href":"/yemek-tarifleri","label":"Yemek Tarifleri"},
            {"href":"/isletme-kayit","label":"İşletme Ekle"}
          ]
        }'::jsonb,
        'Header ust bar hizli linkleri'
      ),
      (
        'footer.links',
        '{
          "explore":[
            {"label":"Mekanlar","href":"/mekanlar"},
            {"label":"Kebapçılar","href":"/mekanlar/kebapcilar"},
            {"label":"Ciğerciler","href":"/mekanlar/cigerciler"},
            {"label":"Kafeler","href":"/mekanlar/kafeler"},
            {"label":"Gezilecek Yerler","href":"/gezilecek-yerler"},
            {"label":"Etkinlikler","href":"/etkinlikler"}
          ],
          "districts":[
            {"label":"Eyyübiye","href":"/ilceler/eyyubiye"},
            {"label":"Haliliye","href":"/ilceler/haliliye"},
            {"label":"Karaköprü","href":"/ilceler/karakopru"},
            {"label":"Halfeti","href":"/ilceler/halfeti"},
            {"label":"Harran","href":"/ilceler/harran"},
            {"label":"Tüm İlçeler","href":"/ilceler"}
          ],
          "popular":[
            {"label":"Yemek Tarifleri","href":"/yemek-tarifleri"},
            {"label":"Nöbetçi Eczaneler","href":"/saglik/nobetci-eczaneler"},
            {"label":"Topluluk Özellikleri","href":"/topluluk"},
            {"label":"Blog","href":"/blog"}
          ],
          "company":[
            {"label":"Hakkımızda","href":"/hakkinda"},
            {"label":"İletişim","href":"/iletisim"},
            {"label":"İşletme Ekleyin","href":"/isletme-kayit"},
            {"label":"Gizlilik Politikası","href":"/gizlilik-politikasi"},
            {"label":"Kullanım Koşulları","href":"/kullanim-kosullari"},
            {"label":"KVKK","href":"/kvkk"}
          ],
          "services":[
            {"label":"Nöbetçi Eczaneler","href":"/saglik/nobetci-eczaneler"},
            {"label":"Otobüs Saatleri","href":"/ulasim/otobus-saatleri"},
            {"label":"Uçak Saatleri","href":"/ulasim/ucak-saatleri"},
            {"label":"Etkinlik Takvimi","href":"/etkinlikler"},
            {"label":"Yemek Tarifleri","href":"/yemek-tarifleri"},
            {"label":"Premium Üyelik","href":"/fiyatlandirma"},
            {"label":"İlçe Rehberi","href":"/ilceler"},
            {"label":"Mekan Rehberi","href":"/mekanlar"}
          ]
        }'::jsonb,
        'Footer link gruplari'
      ),
      (
        'homepage.mainCta',
        '{
          "title":"İşletmenizi Şanlıurfa rehberine ekleyin",
          "description":"Sanliurfa.com üzerinde görünürlük kazanmak, yerel kullanıcıya ulaşmak ve işletme profilinizi yönetmek için hemen başvurun.",
          "primaryLabel":"İşletme Kaydı Başlat",
          "primaryHref":"/isletme-kayit",
          "secondaryLabel":"İletişim ve Destek",
          "secondaryHref":"/iletisim"
        }'::jsonb,
        'Ana sayfa ana CTA alani'
      )
      ON CONFLICT (setting_key) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DELETE FROM site_settings
      WHERE setting_key IN ('header.utilityLinks', 'footer.links', 'homepage.mainCta');
    `);
  },
};

