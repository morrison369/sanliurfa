export type AdminCrmModule = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  existingHref?: string;
  table?: string;
  icon: string;
  filters: string[];
  fields: string[];
  actions: string[];
  botKeys: string[];
};

export type AdminCrmBot = {
  key: string;
  title: string;
  description: string;
  risk: 'düşük' | 'orta' | 'yüksek';
  moduleHref: string;
  checks: string[];
};

export const ADMIN_CRM_MODULES: AdminCrmModule[] = [
  {
    slug: 'businesses',
    title: 'Mekanlar CRM',
    eyebrow: 'Şehir rehberi çekirdeği',
    description:
      'İşletme profilleri, kategori, konum, medya, SEO, sponsor ve yayın durumunu tek CRM ekranında yönetin.',
    primaryHref: '/admin/places/add',
    primaryLabel: 'Yeni işletme',
    existingHref: '/admin/places',
    table: 'places',
    icon: 'lucide:store',
    filters: ['Kategori', 'Alt kategori', 'İlçe', 'Mahalle', 'Durum', 'Sponsorlu', 'Öne çıkan', 'SEO eksik', 'Görsel eksik', 'Konum eksik'],
    fields: ['İşletme adı', 'Slug', 'Adres', 'Telefon', 'WhatsApp', 'Google Maps', 'Enlem/boylam', 'Çalışma saatleri', 'Logo', 'Kapak', 'Galeri', 'SEO title', 'Schema LocalBusiness'],
    actions: ['Düzenle', 'Önizle', 'SEO kontrol', 'Haritada gör', 'Yorumları gör', 'Toplu yayına al', 'Arşivle'],
    botKeys: ['business-data', 'map-check', 'image-alt', 'seo'],
  },
  {
    slug: 'submissions',
    title: 'İşletme Başvuruları',
    eyebrow: 'Pipeline',
    description:
      'Yeni başvuru, inceleniyor, eksik bilgi, onaylandı, yayına alındı ve reddedildi kolonlarıyla işletme kayıt akışı.',
    existingHref: '/admin/claims',
    table: 'place_claims',
    icon: 'lucide:kanban-square',
    filters: ['Pipeline durumu', 'İlçe', 'Kategori', 'Başvuru tarihi', 'Eksik bilgi', 'Yayına hazır'],
    fields: ['Başvuran kişi', 'Telefon', 'E-posta', 'İşletme adı', 'Adres', 'Kategori', 'İlçe', 'Admin notları', 'Durum geçmişi'],
    actions: ['İncele', 'Eksik bilgi iste', 'Onayla', 'İşletmeye dönüştür', 'Reddet', 'Arşivle'],
    botKeys: ['submission-check', 'business-data'],
  },
  {
    slug: 'classifieds',
    title: 'Ücretsiz İlanlar',
    eyebrow: 'Üye ilan pazarı',
    description:
      'Şanlıurfa üyelerine özel ücretsiz emlak, vasıta, yedek parça ve ikinci el ilanlarını onay kuyruğu, kategori ve ilçe filtresiyle yönetin.',
    primaryHref: '/ilan-ekle',
    primaryLabel: 'Public ilan ver',
    existingHref: '/ilanlar',
    table: 'classified_listings',
    icon: 'lucide:badge-plus',
    filters: ['Kategori', 'İlçe', 'Onay bekliyor', 'Yayında', 'Reddedildi', 'Görsel eksik', 'Telefon eksik', 'Süresi doluyor'],
    fields: ['Başlık', 'Kategori', 'İlçe', 'Mahalle', 'Fiyat', 'Açıklama', 'Telefon', 'Görseller', 'Durum', 'Yayın tarihi', 'Son geçerlilik'],
    actions: ['İncele', 'Yayına al', 'Reddet', 'Arşivle', 'Önizle', 'Üye profiline git'],
    botKeys: ['classifieds-check', 'image-alt', 'moderation'],
  },
  {
    slug: 'locations/districts',
    title: 'İlçe Yönetimi',
    eyebrow: 'Yerel SEO',
    description:
      '13 Şanlıurfa ilçesinin SEO metinleri, kapak görselleri, öne çıkan mekanları ve ilçe rehber içerikleri.',
    table: 'districts',
    icon: 'lucide:map',
    filters: ['Aktif/pasif', 'Mekansız ilçe', 'Kapak görseli eksik', 'SEO eksik'],
    fields: ['İlçe adı', 'Slug', 'Açıklama', 'SEO title', 'SEO description', 'H1', 'Kapak görseli', 'Harita koordinatı', 'İç link önerileri'],
    actions: ['Düzenle', 'Önizle', 'İlçe sayfasını aç', 'Öne çıkan mekan seç'],
    botKeys: ['seo', 'internal-link', 'map-check'],
  },
  {
    slug: 'locations/neighborhoods',
    title: 'Mahalle Yönetimi',
    eyebrow: 'Programmatic yerel sayfalar',
    description:
      'Mahalle slug, bağlı ilçe, mekan sayısı, SEO açıklaması ve aktif/pasif sayfa yönetimi.',
    table: 'neighborhoods',
    icon: 'lucide:route',
    filters: ['İlçe', 'Aktif/pasif', 'Mekansız mahalle', 'SEO eksik'],
    fields: ['Mahalle adı', 'Bağlı ilçe', 'Slug', 'SEO açıklaması', 'Mahalledeki mekan sayısı', 'Sayfa durumu'],
    actions: ['Düzenle', 'Önizle', 'Mekanları filtrele'],
    botKeys: ['seo', 'duplicate-data'],
  },
  {
    slug: 'transport/bus',
    title: 'Otobüs Hatları',
    eyebrow: 'Ulaşım verisi',
    description: 'Otobüs hatları, saatleri, rota formatı, veri tazeliği ve admin notları.',
    existingHref: '/admin/ulasim',
    table: 'bus_routes',
    icon: 'lucide:bus',
    filters: ['Hat', 'İlçe', 'Eksik saat', 'Eski veri', 'Hatalı format'],
    fields: ['Hat kodu', 'Başlangıç', 'Bitiş', 'Saatler', 'Rota açıklaması', 'Son güncelleme', 'Veri kaynağı'],
    actions: ['Düzenle', 'Önizle', 'Veri kontrol botu çalıştır'],
    botKeys: ['transport-check'],
  },
  {
    slug: 'transport/flights',
    title: 'Uçak Saatleri',
    eyebrow: 'GAP Havalimanı',
    description: 'Uçak saatleri, havalimanı bilgileri, taksi/transfer noktaları ve veri tazeliği.',
    existingHref: '/admin/ulasim',
    icon: 'lucide:plane',
    filters: ['Eski veri', 'Eksik saat', 'Eksik rota', 'Aktif/pasif'],
    fields: ['Uçuş', 'Kalkış', 'Varış', 'Saat', 'Havalimanı bilgisi', 'Transfer notları', 'Son güncelleme'],
    actions: ['Düzenle', 'Önizle', 'Veri kontrol botu çalıştır'],
    botKeys: ['transport-check'],
  },
  {
    slug: 'map',
    title: 'Harita Yönetimi',
    eyebrow: 'Konum kalitesi',
    description: 'Haritada görünen mekanlar, eksik/hatalı koordinatlar, pin kategorileri ve toplu koordinat önerileri.',
    table: 'places',
    icon: 'lucide:map-pinned',
    filters: ['Koordinatı eksik', 'Şüpheli konum', 'İlçe uyuşmazlığı', 'Kategori pinleri'],
    fields: ['Mekan', 'Adres', 'İlçe', 'Mahalle', 'Enlem', 'Boylam', 'Google Maps linki', 'Pin kategorisi'],
    actions: ['Haritada önizle', 'Koordinat öner', 'Toplu güncelleme taslağı oluştur'],
    botKeys: ['map-check'],
  },
  {
    slug: 'community/users',
    title: 'Topluluk Kullanıcıları',
    eyebrow: 'Üye yönetimi',
    description: 'Kullanıcı profilleri, roller, son aktivite, güvenlik notları, ban/askıya alma ve destek akışı.',
    existingHref: '/admin/users',
    table: 'users',
    icon: 'lucide:users',
    filters: ['Rol', 'Aktif/pasif', 'Raporlu', 'Son aktivite', 'E-posta doğrulandı'],
    fields: ['Ad', 'E-posta', 'Rol', 'Son aktivite', 'Kayıt tarihi', 'Güvenlik notları', 'Durum'],
    actions: ['Profili aç', 'Askıya al', 'Rol ata', 'Audit log gör'],
    botKeys: ['moderation', 'duplicate-data'],
  },
  {
    slug: 'community/profiles',
    title: 'Eşleşme Profilleri',
    eyebrow: 'Güvenlik moderasyonu',
    description: 'Fotoğraflı profil, bio, ilçe, rapor sayısı, yaş doğrulama sinyali ve durum yönetimi.',
    table: 'user_match_profiles',
    icon: 'lucide:heart-handshake',
    filters: ['Aktif', 'İncelemede', 'Raporlu', 'Fotoğraf bekliyor', 'İlçe'],
    fields: ['Profil sahibi', 'Fotoğraflar', 'Bio', 'İlçe', 'Durum', 'Rapor sayısı', 'Son aktivite'],
    actions: ['Onayla', 'Askıya al', 'Reddet', 'Kullanıcı notu ekle'],
    botKeys: ['moderation'],
  },
  {
    slug: 'community/matches',
    title: 'Eşleşme Akışı',
    eyebrow: 'Topluluk güvenliği',
    description: 'Eşleşme kayıtları, karşılıklı beğeni sinyali, raporlu eşleşmeler ve mesaj başlangıçları.',
    icon: 'lucide:users-round',
    filters: ['Raporlu', 'Aktif', 'Son 7 gün', 'Mesaj başladı'],
    fields: ['Kullanıcılar', 'Eşleşme tarihi', 'Mesaj durumu', 'Risk sinyali'],
    actions: ['İncele', 'Raporları aç', 'Güvenlik notu ekle'],
    botKeys: ['moderation'],
  },
  {
    slug: 'community/reports',
    title: 'Topluluk Raporları',
    eyebrow: 'Moderasyon kuyruğu',
    description: 'Kullanıcı şikayetleri, mesaj raporları, fotoğraf raporları ve uygulanan moderasyon aksiyonları.',
    existingHref: '/admin/moderation',
    table: 'content_reports',
    icon: 'lucide:shield-alert',
    filters: ['Rapor tipi', 'Risk', 'Durum', 'Atanan moderatör'],
    fields: ['Raporlayan', 'İçerik tipi', 'Sebep', 'Risk skoru', 'Durum', 'Admin notu'],
    actions: ['İncele', 'Onayla', 'Reddet', 'Kullanıcıyı askıya al'],
    botKeys: ['moderation'],
  },
  {
    slug: 'ads',
    title: 'Reklam ve Sponsorlu Alanlar',
    eyebrow: 'Gelir yönetimi',
    description: 'Banner alanları, sponsorlu işletmeler, kategori/ilçe sponsorluğu, süre, görsel ve reklam veren notları.',
    existingHref: '/admin/campaigns',
    table: 'advertisements',
    icon: 'lucide:badge-dollar-sign',
    filters: ['Aktif', 'Süresi bitiyor', 'Boş alan', 'Görsel hatası', 'Sponsorlu mekan'],
    fields: ['Alan', 'Reklam veren', 'Başlangıç', 'Bitiş', 'Tıklama linki', 'Görsel', 'Fatura/not', 'Durum'],
    actions: ['Yayına al', 'Pasife çek', 'Süre uzat', 'Görsel kontrol'],
    botKeys: ['ads-check', 'image-alt'],
  },
  {
    slug: 'media',
    title: 'Medya Kütüphanesi',
    eyebrow: 'Local storage',
    description: 'Grid/liste görünümü, kapak/logo/galeri seçimi, alt text, dosya boyutu ve WebP/AVIF kalite kontrolleri.',
    existingHref: '/admin/site-content',
    icon: 'lucide:image',
    filters: ['Alt text eksik', 'Büyük dosya', 'Oran hatalı', 'Tekrar görsel', 'Kullanılmıyor'],
    fields: ['Dosya', 'Alt text', 'Boyut', 'Oran', 'Kullanıldığı içerikler', 'Format', 'Son güncelleme'],
    actions: ['Önizle', 'Alt text düzenle', 'Kapak olarak seç', 'Galeriye ekle'],
    botKeys: ['image-alt', 'duplicate-data'],
  },
  {
    slug: 'seo',
    title: 'SEO Yönetim Merkezi',
    eyebrow: 'SEO / AEO / GEO / AIO',
    description: 'Eksik title, meta, H1, canonical, schema, focus keyword, sitemap ve iç link kalitesini tek merkezden izleyin.',
    existingHref: '/admin/site-audit',
    icon: 'lucide:search-check',
    filters: ['Eksik title', 'Meta kısa/uzun', 'H1 eksik', 'Duplicate slug', 'Schema eksik', 'İç linksiz', 'Noindex'],
    fields: ['URL', 'Tip', 'SEO skoru', 'Title', 'Meta description', 'Canonical', 'Schema', 'Focus keyword', 'Sitemap'],
    actions: ['Öneri oluştur', 'Önizle', 'Site ayarında düzenle', 'Yayınla'],
    botKeys: ['seo', 'content', 'internal-link'],
  },
  {
    slug: 'bots',
    title: 'Botlar Merkezi',
    eyebrow: 'Manuel yardımcılar',
    description:
      'Arka planda çalışan agent/cron yok. Botlar panel içinde manuel tetiklenir, sadece analiz ve öneri üretir, admin onayı olmadan veri değiştirmez.',
    icon: 'lucide:bot',
    filters: ['Risk seviyesi', 'Son çalışma', 'Öneri sayısı', 'Bekleyen onay'],
    fields: ['Bot adı', 'Son çalışma', 'Bulgu', 'Öneri', 'Risk', 'Durum'],
    actions: ['Manuel çalıştır', 'Sonuçları gör', 'Öneriyi uygula', 'Reddet', 'Düzenle'],
    botKeys: ['seo', 'content', 'business-data', 'submission-check', 'pharmacy-check', 'transport-check', 'map-check', 'image-alt', 'moderation', 'ads-check', 'duplicate-data', 'internal-link'],
  },
  {
    slug: 'settings',
    title: 'Frontend ve Site Ayarları',
    eyebrow: 'Admin yönetimli public site',
    description:
      'Landing page dahil public frontend metinleri, menü, tema tokenları, görseller, hero blokları, footer ve SEO ayarları `site_settings` üzerinden yönetilir.',
    existingHref: '/admin/site-content',
    table: 'site_settings',
    icon: 'lucide:sliders-horizontal',
    filters: ['Homepage', 'Header', 'Footer', 'Tema', 'SEO', 'Draft', 'Yayınlandı'],
    fields: ['homepage.hero', 'homepage.routes', 'homepage.quickAccess', 'homepage.theme', 'header.navLinks', 'footer.links', 'homepage.sectionCopy', 'homepage.sectionStyles'],
    actions: ['Taslak kaydet', 'Önizle', 'Yayınla', 'Rollback'],
    botKeys: ['seo', 'internal-link', 'image-alt'],
  },
  {
    slug: 'audit-log',
    title: 'Audit Log',
    eyebrow: 'Geri alınabilir yönetim',
    description: 'Admin işlemleri, bot önerileri, yayın değişiklikleri ve kritik moderasyon kayıtları.',
    existingHref: '/admin/audit-logs',
    icon: 'lucide:scroll-text',
    filters: ['Kullanıcı', 'Modül', 'Aksiyon', 'Tarih', 'Risk'],
    fields: ['Zaman', 'Admin', 'Aksiyon', 'Kaynak', 'Önce/sonra', 'IP', 'Geri alma durumu'],
    actions: ['Detay aç', 'Geri al', 'Dışa aktar'],
    botKeys: [],
  },
];

export const ADMIN_CRM_BOTS: AdminCrmBot[] = [
  { key: 'seo', title: 'SEO Botu', description: 'Title, meta, H1, canonical, schema, focus keyword ve iç link eksiklerini skorlar.', risk: 'orta', moduleHref: '/admin/bots/seo', checks: ['0-100 SEO skoru', 'Meta önerisi', 'FAQ önerisi', 'Schema önerisi'] },
  { key: 'content', title: 'İçerik Botu', description: 'Blog/rehber içeriklerinde başlık, H2/H3 dengesi, FAQ ve ince içerik uyarısı üretir.', risk: 'orta', moduleHref: '/admin/bots/content', checks: ['Başlık önerisi', 'H2/H3 uyarısı', 'İnce içerik', 'Duplicate slug'] },
  { key: 'business-data', title: 'İşletme Veri Botu', description: 'Mekanlarda eksik telefon, adres, görsel, kategori, SEO ve Google Maps alanlarını bulur.', risk: 'yüksek', moduleHref: '/admin/bots/business-data', checks: ['Eksik iletişim', 'Eksik medya', 'Eksik konum', 'Schema alanları'] },
  { key: 'submission-check', title: 'Başvuru Kontrol Botu', description: 'İşletme başvurularında eksik alan ve yayına dönüşüm hazırlığını kontrol eder.', risk: 'orta', moduleHref: '/admin/bots/business-data', checks: ['Eksik alan', 'Yinelenen işletme', 'İlçe/kategori kontrol'] },
  { key: 'classifieds-check', title: 'İlan Kontrol Botu', description: 'Ücretsiz ilanlarda Şanlıurfa ilçe kuralı, eksik görsel/telefon, spam başlık ve süresi dolan kayıtları listeler.', risk: 'orta', moduleHref: '/admin/bots/content', checks: ['Şehir kuralı', 'Eksik iletişim', 'Görsel eksikliği', 'Spam sinyali'] },
  { key: 'pharmacy-check', title: 'Eczane Veri Kontrol Botu', description: 'Eski tarihli nöbetçi eczane, eksik telefon/adres ve tekrar kayıtları listeler.', risk: 'yüksek', moduleHref: '/admin/bots/pharmacy-check', checks: ['Veri tazeliği', 'Eksik telefon', 'Duplicate eczane', 'SLA uyarısı'] },
  { key: 'transport-check', title: 'Ulaşım Veri Kontrol Botu', description: 'Otobüs/uçak saatlerinde eski veri, eksik saat, hatalı format ve eksik rota uyarısı üretir.', risk: 'orta', moduleHref: '/admin/bots/content', checks: ['Eski veri', 'Saat formatı', 'Rota eksikliği'] },
  { key: 'map-check', title: 'Harita Koordinat Botu', description: 'Eksik/şüpheli koordinatları ve yanlış ilçeye düşen mekanları admin onayına sunar.', risk: 'yüksek', moduleHref: '/admin/bots/map-check', checks: ['Eksik lat/lng', 'Şüpheli koordinat', 'İlçe uyumsuzluğu'] },
  { key: 'image-alt', title: 'Görsel / Alt Text Botu', description: 'Alt text eksikliği, büyük dosya, kapak oranı ve tekrar görseller için öneri üretir.', risk: 'düşük', moduleHref: '/admin/bots/content', checks: ['Alt text', 'Dosya boyutu', 'WebP/AVIF', 'Duplicate görsel'] },
  { key: 'moderation', title: 'Topluluk Güvenlik Botu', description: 'Profil, fotoğraf, mesaj ve yorumlarda spam/şikayet/sahte profil risk sinyali verir.', risk: 'yüksek', moduleHref: '/admin/bots/moderation', checks: ['Risk skoru', 'Spam sinyali', 'Rapor yoğunluğu', 'Admin onayı'] },
  { key: 'ads-check', title: 'Reklam Kontrol Botu', description: 'Süresi biten reklamları, boş sponsor alanlarını ve görsel ölçü hatalarını listeler.', risk: 'orta', moduleHref: '/admin/bots/content', checks: ['Süre bitişi', 'Boş alan', 'Görsel oranı'] },
  { key: 'duplicate-data', title: 'Duplicate Veri Botu', description: 'Mekan, mahalle, eczane, blog slug ve görsel tekrarlarını tespit eder.', risk: 'orta', moduleHref: '/admin/bots/content', checks: ['Duplicate slug', 'Benzer ad', 'Tekrar medya'] },
  { key: 'internal-link', title: 'İç Link Botu', description: 'Kategori, ilçe, mekan ve blog arasında önerilen iç bağlantıları üretir.', risk: 'düşük', moduleHref: '/admin/bots/content', checks: ['İç linksiz sayfa', 'Kategori önerisi', 'İlçe bağlantısı'] },
];

export function findAdminCrmModule(slug: string): AdminCrmModule | undefined {
  const normalized = slug.replace(/^\/+|\/+$/g, '') || 'dashboard';
  return ADMIN_CRM_MODULES.find((module) => module.slug === normalized);
}
