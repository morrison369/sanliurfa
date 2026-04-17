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
  webhooks: {
    title: 'Webhook yönetimi',
    loading: 'Webhook yönetimi yükleniyor...',
    empty: 'Henüz gösterilecek webhook bulunmuyor.',
    copyId: 'Webhook kimliğini kopyala',
  },
  verificationQueue: {
    title: 'Doğrulama kuyruğu',
    loading: 'Doğrulama talepleri yükleniyor...',
    empty: 'Bekleme listesinde doğrulama talebi bulunmuyor.',
    rejectReasonLabel: 'Reddetme nedeni (minimum 10 karakter)',
  },
  analytics: {
    loading: 'Analitik verileri yükleniyor...',
    unavailable: 'Analitik verisi bulunmuyor.',
  },
  profile: {
    loading: 'Profil yükleniyor...',
    settingsLoading: 'Kullanıcı ayarları yükleniyor...',
  },
} as const;

export type UiCopyDictionary = typeof UI_COPY_TR;

