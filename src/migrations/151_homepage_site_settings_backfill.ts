import type { Migration } from '../lib/migrations';

export const migration_151_homepage_site_settings_backfill: Migration = {
  version: '151_homepage_site_settings_backfill',
  description: 'Backfill missing homepage site_settings keys for DB-first landing blocks',

  up: async (pool: any) => {
    await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, description)
      VALUES
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
        'homepage.heroQuickLinks',
        '{
          "items":[
            {"label":"Nöbetçi Eczaneler","href":"/saglik/nobetci-eczaneler"},
            {"label":"Otobüs Saatleri","href":"/ulasim/otobus-saatleri"},
            {"label":"Uçak Saatleri","href":"/ulasim/ucak-saatleri"},
            {"label":"Etkinlikler","href":"/etkinlikler"},
            {"label":"Yemek Tarifleri","href":"/yemek-tarifleri"}
          ]
        }'::jsonb,
        'Ana sayfa hero hızlı linkleri'
      ),
      (
        'homepage.liveStatusCards',
        '{
          "items":[
            {"key":"pharmacy","title":"Nöbetçi Eczane Durumu","metricLabel":"kayıtlı nöbetçi eczane","statusText":"Aktif veri akışı","href":"/saglik/nobetci-eczaneler","cta":"Nöbetçi Eczaneleri Aç","badgeClass":"bg-emerald-500/15 text-emerald-300 border-emerald-500/40"},
            {"key":"bus","title":"Otobüs Saatleri Durumu","metricLabel":"aktif otobüs hattı","statusText":"Hat verisi hazır","href":"/ulasim/otobus-saatleri","cta":"Otobüs Saatlerini Aç","badgeClass":"bg-sky-500/15 text-sky-300 border-sky-500/40"},
            {"key":"flight","title":"Uçak Saatleri Durumu","metricLabel":"havalimanı odaklı takip","statusText":"Planlama rehberi aktif","href":"/ulasim/ucak-saatleri","cta":"Uçak Saatlerini Aç","badgeClass":"bg-violet-500/15 text-violet-300 border-violet-500/40"}
          ]
        }'::jsonb,
        'Ana sayfa güncel durum kartları'
      ),
      (
        'homepage.serviceQuickLinks',
        '{
          "items":[
            {"key":"pharmacy","categoryLabel":"Sağlık","title":"Yakındaki Nöbetçi Eczane Akışı","description":"İlçe seçimiyle anında nöbetçi eczane sonuçlarını açın.","href":"/saglik/nobetci-eczaneler","hoverBorderClass":"hover:border-emerald-400/60"},
            {"key":"bus","categoryLabel":"Ulaşım","title":"İlçe Bazlı Otobüs Saatleri","description":"Günlük rota planı için hat ve saat ekranına hızlı geçiş yapın.","href":"/ulasim/otobus-saatleri","hoverBorderClass":"hover:border-sky-400/60"},
            {"key":"flight","categoryLabel":"Havalimanı","title":"GAP Uçak Saatleri ve Planlama","description":"Varış-kalkış odaklı uçuş planlamasını tek ekranda yönetin.","href":"/ulasim/ucak-saatleri","hoverBorderClass":"hover:border-violet-400/60"}
          ]
        }'::jsonb,
        'Ana sayfa servis hızlı link kartları'
      ),
      (
        'homepage.communityPanel',
        '{
          "title":"Topluluk ve Eşleşme",
          "description":"Sosyal özellikler (takip, aktivite, mesajlaşma) ve eşleşme modülüyle topluluk deneyimini genişletebilirsiniz.",
          "items":[
            {"label":"Topluluk Özellikleri","href":"/takipciler"},
            {"label":"Eşleşme","href":"/eslesme"},
            {"label":"Üyelik Durumu","href":"/abonelik"}
          ]
        }'::jsonb,
        'Ana sayfa topluluk paneli'
      ),
      (
        'homepage.trendingFallbackQueries',
        '{
          "items":[
            {"query":"Şanlıurfa nöbetçi eczane"},
            {"query":"Şanlıurfa otobüs saatleri"},
            {"query":"Şanlıurfa uçak saatleri"},
            {"query":"Şanlıurfa kebapçılar"},
            {"query":"Şanlıurfa gezilecek yerler"}
          ]
        }'::jsonb,
        'Trend aramalar fallback listesi'
      )
      ON CONFLICT (setting_key) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DELETE FROM site_settings
      WHERE setting_key IN (
        'homepage.quickCategories',
        'homepage.heroQuickLinks',
        'homepage.liveStatusCards',
        'homepage.serviceQuickLinks',
        'homepage.communityPanel',
        'homepage.trendingFallbackQueries'
      );
    `);
  },
};

