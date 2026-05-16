export type LocationMode = 'locations/districts' | 'locations/neighborhoods';
export type OpsMode = 'events' | 'pharmacies';
export type ControlMode = 'reviews' | 'ads' | 'map';
export type SocialMode = 'community/users' | 'community/profiles' | 'community/reports' | 'messages';

export function getLocationPanelConfig(mode: LocationMode) {
  const isNeighborhoods = mode === 'locations/neighborhoods';
  return {
    resource: isNeighborhoods ? 'neighborhoods' : 'districts',
    title: isNeighborhoods ? 'Canlı Mahalle CRM tablosu' : 'Canlı İlçe CRM tablosu',
    description: 'SEO, slug, koordinat ve yerel sayfa alanları admin onayıyla kaydedilir. Otomatik veri değiştirme yok.',
    columns: isNeighborhoods ? 7 : 6,
  };
}

export function getOpsPanelConfig(mode: OpsMode) {
  const isEvents = mode === 'events';
  return {
    resource: isEvents ? 'events' : 'pharmacies',
    title: isEvents ? 'Canlı Etkinlik CRM tablosu' : 'Canlı Nöbetçi Eczane CRM tablosu',
    description: isEvents
      ? 'Etkinlik adı, slug, tarih, lokasyon, ücretsiz/ücretli ve yayın durumu panelden yönetilir.'
      : 'Eczane adı, adres, telefon, ilçe, nöbet tarihi ve veri tazeliği panelden yönetilir.',
    tertiaryColumn: isEvents ? 'Tarih / Durum' : 'Telefon / Nöbet',
    quaternaryColumn: isEvents ? 'Lokasyon / Kategori' : 'Adres / İlçe',
    filterOptions: isEvents
      ? [
          ['draft', 'Taslak/pasif'],
          ['upcoming', 'Yaklaşan'],
          ['image-missing', 'Görsel eksik'],
        ]
      : [
          ['duty', 'Nöbetçi'],
          ['phone-missing', 'Telefon eksik'],
          ['coordinate-missing', 'Koordinat eksik'],
        ],
  };
}

export function getControlPanelConfig(mode: ControlMode) {
  if (mode === 'reviews') {
    return {
      resource: 'reviews',
      title: 'Canlı Yorum Moderasyon tablosu',
      description: 'Yorum durumu, gizleme ve moderasyon bayrağı admin onayıyla güncellenir.',
      filterOptions: [
        ['pending', 'Bekleyen'],
        ['flagged', 'Flagged'],
        ['hidden', 'Gizli'],
      ],
    };
  }
  if (mode === 'ads') {
    return {
      resource: 'ads',
      title: 'Canlı Reklam ve Sponsor tablosu',
      description: 'Reklam başlığı, bütçe, tarih, durum ve sponsor bağlantıları tek ekranda yönetilir.',
      filterOptions: [
        ['active', 'Aktif'],
        ['ending', 'Süresi biten'],
        ['budget-missing', 'Bütçe eksik'],
      ],
    };
  }
  return {
    resource: 'places',
    title: 'Canlı Harita Koordinat kontrolü',
    description: 'Koordinatı eksik veya şüpheli mekanlar listelenir; enlem/boylam ve ilçe bağlantısı kaydedilir.',
    filterOptions: [
      ['coordinate-missing', 'Koordinat eksik'],
      ['district-missing', 'İlçe eksik'],
      ['address-missing', 'Adres eksik'],
    ],
  };
}

export function getSocialPanelConfig(mode: SocialMode) {
  if (mode === 'community/users') {
    return {
      resource: 'users',
      title: 'Canlı Üye CRM tablosu',
      description: 'Rol, durum, puan ve abonelik segmenti admin tarafından kontrollü güncellenir.',
      filterOptions: [
        ['admin', 'Admin'],
        ['suspended', 'Askıda/pasif'],
        ['reported', 'Raporlu'],
      ],
    };
  }
  if (mode === 'community/profiles') {
    return {
      resource: 'match-profiles',
      title: 'Canlı Eşleşme Profili moderasyonu',
      description: 'Bio, keşfedilebilirlik, ilçe tercihi ve profil tamamlanma sinyali tek tabloda izlenir.',
      filterOptions: [
        ['discoverable', 'Keşfedilebilir'],
        ['incomplete', 'Eksik profil'],
        ['district-missing', 'İlçe eksik'],
      ],
    };
  }
  if (mode === 'community/reports') {
    return {
      resource: 'reports',
      title: 'Canlı Topluluk Raporları kuyruğu',
      description: 'Şikayet sebebi, durum ve çözüm notu moderasyon onayıyla güncellenir.',
      filterOptions: [
        ['pending', 'Bekleyen'],
        ['resolved', 'Çözülen'],
        ['message', 'Mesaj raporu'],
      ],
    };
  }
  return {
    resource: 'messages',
    title: 'Canlı Mesajlaşma / iletişim kuyruğu',
    description: 'Kullanıcı/ziyaretçi mesajları durumlandırılır; otomatik silme veya arka plan botu yoktur.',
    filterOptions: [
      ['unread', 'Okunmamış'],
      ['open', 'Açık'],
      ['email-missing', 'E-posta eksik'],
    ],
  };
}

export function getSeoPanelConfig() {
  return {
    resource: 'seo-pages',
    title: 'Canlı SEO/AEO/GEO sayfa merkezi',
    description:
      'Programmatic SEO sayfaları, meta alanları, başlık, intro metni ve index aktifliği admin onayıyla yönetilir.',
    filterOptions: [
      ['missing-title', 'Title/meta eksik'],
      ['missing-intro', 'Intro eksik'],
      ['inactive', 'Pasif'],
    ],
  };
}
