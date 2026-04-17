export const UI_COPY_TR = {
  common: {
    save: 'Kaydet',
    cancel: 'İptal et',
    close: 'Kapat',
    remove: 'Kaldır',
    viewDetails: 'Ayrıntıları gör',
    refreshList: 'Listeyi yenile',
    processing: 'İşleniyor...',
    success: 'İşlem başarılı.',
    error: 'Bir hata oluştu.',
  },
  notifications: {
    centerTitle: 'Bildirim merkezi',
    loading: 'Bildirim merkezi yükleniyor...',
    all: 'Tüm bildirimlerim',
    unread: 'Okunmamış bildirimler',
    emptyAll: 'Henüz gösterilecek bildirim bulunmuyor.',
    emptyUnread: 'Henüz okunmamış bildirim bulunmuyor.',
    markRead: 'Okundu olarak işaretle',
    archive: 'Arşive taşı',
  },
  collections: {
    createTitle: 'Yeni koleksiyon oluştur',
    listTitle: 'Koleksiyon listem',
    loading: 'Koleksiyon listesi yükleniyor...',
    loadingMine: 'Koleksiyonlarım yükleniyor...',
    empty: 'Henüz oluşturulmuş koleksiyon bulunmuyor.',
    view: 'Koleksiyonu görüntüle',
    descriptionPlaceholder: 'Koleksiyon hakkında kısa bir açıklama yazın...',
    publicHint: 'Herkese açık koleksiyonlar diğer kullanıcılar tarafından görüntülenebilir ve takip edilebilir.',
  },
  reports: {
    listTitle: 'Rapor listesi',
    templatesTitle: 'Dışa aktarma şablonları',
    loading: 'Raporlar yükleniyor...',
    empty: 'Henüz görüntülenecek rapor bulunmuyor.',
    run: 'Raporu çalıştır',
    download: 'Raporu indir',
  },
  subscription: {
    loading: 'Abonelik bilgileri yükleniyor...',
    activePlan: 'Aktif plan',
    managePlans: 'Planları gör',
    upgrade: "Premium'a yükselt",
  },
  subscriptionAdmin: {
    loading: 'Abonelik yönetimi yükleniyor...',
  },
  webhooks: {
    title: 'Webhook yönetimi',
    loading: 'Webhook yönetimi yükleniyor...',
    empty: 'Henüz gösterilecek webhook bulunmuyor.',
    copyId: 'Webhook kimliğini kopyala',
  },
  webhookAnalytics: {
    loading: 'Webhook analitiği yükleniyor...',
  },
  verificationQueue: {
    title: 'Doğrulama kuyruğu',
    loading: 'Doğrulama talepleri yükleniyor...',
    empty: 'Bekleme listesinde doğrulama talebi bulunmuyor.',
    rejectReasonLabel: 'Reddetme nedeni (minimum 10 karakter)',
  },
  analytics: {
    loading: 'Analitik paneli yükleniyor...',
    unavailable: 'Analitik verisi bulunmuyor.',
    platformSummary: 'Platform özeti',
    popularSearches: 'Popüler aramalar',
    trendingPlaces: 'Trend olan mekanlar',
  },
  content: {
    loading: 'İçerikler yükleniyor...',
  },
  businessAnalytics: {
    loading: 'İşletme analitiği yükleniyor...',
  },
  adminDashboard: {
    loading: 'Yönetim panosu yükleniyor...',
  },
  billing: {
    loading: 'Ödeme geçmişi yükleniyor...',
  },
  transactions: {
    loading: 'İşlem geçmişi yükleniyor...',
  },
  preferences: {
    loading: 'Bildirim tercihleri yükleniyor...',
  },
  profile: {
    loading: 'Profil yükleniyor...',
    settingsLoading: 'Kullanıcı ayarları yükleniyor...',
    publicLoading: 'Açık profil yükleniyor...',
    title: 'Profilim',
    favoritesEmpty: 'Henüz favori mekan bulunmuyor.',
    activityEmpty: 'Henüz etkinlik bulunmuyor.',
  },
  search: {
    loading: 'Arama sonuçları yükleniyor...',
  },
  recommendations: {
    loading: 'Öneriler yükleniyor...',
  },
  userSuggestions: {
    loading: 'Kullanıcı önerileri yükleniyor...',
  },
  collectionDetail: {
    loading: 'Koleksiyon ayrıntıları yükleniyor...',
  },
  activityFeed: {
    loading: 'Etkinlik akışı yükleniyor...',
  },
} as const;

export type UiCopyDictionary = typeof UI_COPY_TR;
