-- Blog yazılarının published_at tarihlerini Mart–Mayıs 2026'ya yay

UPDATE blog_posts SET published_at = '2026-03-05 09:00:00' WHERE slug = 'gobeklitepe-rehberi-ziyaret-bilgileri';
UPDATE blog_posts SET published_at = '2026-03-10 10:30:00' WHERE slug = 'harran-konik-evleri-mimari-hikayesi';
UPDATE blog_posts SET published_at = '2026-03-18 11:00:00' WHERE slug = 'sanliurfa-muzeleri-rehberi';
UPDATE blog_posts SET published_at = '2026-03-25 09:30:00' WHERE slug = 'halfetide-1-gun-tekne-turu';
UPDATE blog_posts SET published_at = '2026-04-02 10:00:00' WHERE slug = 'sanliurfa-gezilecek-10-tarihi-yer';
UPDATE blog_posts SET published_at = '2026-04-08 11:30:00' WHERE slug = 'sanliurfa-sira-gecesi-mekanlari';
UPDATE blog_posts SET published_at = '2026-04-14 09:00:00' WHERE slug = 'cig-kofte-nasil-yapilir-sanliurfa-tarifi';
UPDATE blog_posts SET published_at = '2026-04-20 10:00:00' WHERE slug = 'sanliurfa-en-iyi-kebapcilar';
UPDATE blog_posts SET published_at = '2026-04-26 11:00:00' WHERE slug = 'kunefe-nereden-yenir-sanliurfa';
UPDATE blog_posts SET published_at = '2026-05-02 09:30:00' WHERE slug = 'bakircilar-carsisi-hediyelik-rehberi';
UPDATE blog_posts SET published_at = '2026-05-06 10:00:00' WHERE slug = 'sanliurfada-kahvalti-7-efsane-mekan';
UPDATE blog_posts SET published_at = '2026-05-09 11:00:00' WHERE slug = 'sanliurfa-aile-ile-gezilecek-yerler';
UPDATE blog_posts SET published_at = '2026-05-13 09:30:00' WHERE slug = 'sanliurfa-otobus-saatleri-nasil-ogrenilir';
UPDATE blog_posts SET published_at = '2026-05-17 10:30:00' WHERE slug = 'sanliurfa-festivalleri-etkinlikleri-2026';
UPDATE blog_posts SET published_at = '2026-05-20 11:00:00' WHERE slug = 'sanliurfa-konaklama-otel-rehberi';

SELECT slug, published_at::date AS tarih FROM blog_posts ORDER BY published_at;
