type EventLike = {
  description?: string | null;
  image_url?: string | null;
  start_date?: string | null;
  location?: string | null;
  category?: string | null;
  status?: string | null;
};

type PharmacyLike = {
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  duty_date?: string | null;
  district_id?: number | null;
  is_on_duty?: boolean | null;
};

type SeoPageLike = {
  title?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  heading?: string | null;
  intro_text?: string | null;
  is_active?: boolean | null;
};

type PlaceLike = {
  meta_description?: string | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  district_id?: number | string | null;
  address?: string | null;
  status?: string | null;
};

type ReviewLike = {
  content?: string | null;
  rating?: number | string | null;
  status?: string | null;
  is_moderated?: boolean | null;
  is_hidden?: boolean | null;
  is_verified?: boolean | null;
};

type AdLike = {
  budget?: number | string | null;
  ended_at?: string | null;
  place_id?: string | null;
  status?: string | null;
  started_at?: string | null;
  impressions?: number | string | null;
  clicks?: number | string | null;
};

type UserLike = {
  full_name?: string | null;
  email?: string | null;
  status?: string | null;
  report_count?: number | string | null;
  two_factor_enabled?: boolean | null;
  role?: string | null;
};

type MatchProfileLike = {
  bio?: string | null;
  preferred_district?: string | null;
  looking_for?: string | null;
  profile_completeness?: number | string | null;
  photos?: unknown;
  is_discoverable?: boolean | null;
  user_status?: string | null;
};

type ReportLike = {
  reason?: string | null;
  description?: string | null;
  status?: string | null;
  content_type?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
};

type MessageLike = {
  email?: string | null;
  body?: string | null;
  subject?: string | null;
  status?: string | null;
  name?: string | null;
};

export function deriveEventCrmFields(row: EventLike) {
  const missing_fields = [
    row.description ? null : 'Açıklama eksik',
    row.image_url ? null : 'Görsel eksik',
    row.start_date ? null : 'Tarih eksik',
    row.location ? null : 'Lokasyon eksik',
    row.category ? null : 'Kategori eksik',
  ].filter(Boolean) as string[];

  const risk_flags = {
    missingDescription: !row.description,
    missingImage: !row.image_url,
    missingDate: !row.start_date,
    missingLocation: !row.location,
    missingCategory: !row.category,
    inactive: !!row.status && !['active', 'published'].includes(String(row.status)),
  };

  const health_score = Math.max(0, 100 - missing_fields.length * 18 - (risk_flags.inactive ? 8 : 0));

  return { missing_fields, risk_flags, health_score };
}

export function derivePharmacyCrmFields(row: PharmacyLike) {
  const missing_fields = [
    row.phone ? null : 'Telefon eksik',
    row.address ? null : 'Adres eksik',
    row.latitude && row.longitude ? null : 'Koordinat eksik',
    row.district_id ? null : 'İlçe eksik',
    row.duty_date ? null : 'Nöbet tarihi eksik',
  ].filter(Boolean) as string[];

  const risk_flags = {
    missingPhone: !row.phone,
    missingAddress: !row.address,
    missingCoordinates: !(row.latitude && row.longitude),
    missingDistrict: !row.district_id,
    missingDutyDate: !row.duty_date,
    offDuty: row.is_on_duty === false,
  };

  const health_score = Math.max(0, 100 - missing_fields.length * 18 - (risk_flags.offDuty ? 4 : 0));

  return { missing_fields, risk_flags, health_score };
}

export function deriveSeoPageCrmFields(row: SeoPageLike) {
  const missing_fields = [
    row.title && String(row.title).length >= 20 ? null : 'Title zayıf',
    row.meta_title && String(row.meta_title).length >= 20 ? null : 'Meta title zayıf',
    row.meta_description && String(row.meta_description).length >= 70 ? null : 'Meta description zayıf',
    row.heading && String(row.heading).length >= 10 ? null : 'H1 zayıf',
    row.intro_text && String(row.intro_text).length >= 120 ? null : 'Intro zayıf',
  ].filter(Boolean) as string[];

  const health_score = Math.max(0, 100 - missing_fields.length * 20 - (row.is_active ? 0 : 5));
  const seo_state = health_score >= 80 ? 'good' : health_score >= 60 ? 'warning' : 'critical';

  return {
    missing_fields,
    risk_flags: {
      missingTitle: missing_fields.includes('Title zayıf'),
      missingMetaTitle: missing_fields.includes('Meta title zayıf'),
      missingMetaDescription: missing_fields.includes('Meta description zayıf'),
      missingHeading: missing_fields.includes('H1 zayıf'),
      missingIntro: missing_fields.includes('Intro zayıf'),
      inactive: !row.is_active,
    },
    health_score,
    seo_state,
  };
}

export function derivePlaceCrmFields(row: PlaceLike) {
  const missing_fields = [
    row.meta_description ? null : 'SEO eksik',
    row.image_url ? null : 'Görsel eksik',
    row.latitude && row.longitude ? null : 'Koordinat eksik',
    row.district_id ? null : 'İlçe eksik',
    row.address ? null : 'Adres eksik',
  ].filter(Boolean) as string[];

  const risk_flags = {
    missingSeo: !row.meta_description,
    missingImage: !row.image_url,
    missingCoordinates: !(row.latitude && row.longitude),
    missingDistrict: !row.district_id,
    missingAddress: !row.address,
    inactive: !!row.status && !['active', 'published'].includes(String(row.status)),
  };

  const health_score = Math.max(0, 100 - missing_fields.length * 16 - (risk_flags.inactive ? 8 : 0));

  return { missing_fields, risk_flags, health_score };
}

export function deriveReviewCrmFields(row: ReviewLike) {
  const ratingNumber = Number(row.rating || 0);
  const missing_fields = [
    row.content && String(row.content).trim().length >= 30 ? null : 'İçerik zayıf',
    ratingNumber > 0 ? null : 'Puan eksik',
    row.is_moderated ? null : 'Moderasyon bekliyor',
  ].filter(Boolean) as string[];

  const risk_flags = {
    thinContent: !(row.content && String(row.content).trim().length >= 30),
    missingRating: !(ratingNumber > 0),
    pendingModeration: !row.is_moderated,
    flagged: row.status === 'flagged',
    hidden: !!row.is_hidden,
    unverified: !row.is_verified,
  };

  const health_score = Math.max(
    0,
    100 -
      missing_fields.length * 18 -
      (risk_flags.flagged ? 12 : 0) -
      (risk_flags.hidden ? 8 : 0) -
      (risk_flags.unverified ? 4 : 0),
  );

  return { missing_fields, risk_flags, health_score };
}

export function deriveAdCrmFields(row: AdLike) {
  const budgetNumber = Number(row.budget || 0);
  const impressions = Number(row.impressions || 0);
  const clicks = Number(row.clicks || 0);
  const ctrLow = impressions >= 100 && clicks === 0;

  const missing_fields = [
    budgetNumber > 0 ? null : 'Bütçe eksik',
    row.ended_at ? null : 'Bitiş tarihi eksik',
    row.place_id ? null : 'Mekan bağlantısı yok',
    row.started_at ? null : 'Başlangıç tarihi eksik',
  ].filter(Boolean) as string[];

  const risk_flags = {
    missingBudget: !(budgetNumber > 0),
    missingEndDate: !row.ended_at,
    missingPlace: !row.place_id,
    missingStartDate: !row.started_at,
    inactive: !!row.status && row.status !== 'active',
    lowCtr: ctrLow,
  };

  const health_score = Math.max(
    0,
    100 -
      missing_fields.length * 16 -
      (risk_flags.inactive ? 8 : 0) -
      (risk_flags.lowCtr ? 6 : 0),
  );

  return { missing_fields, risk_flags, health_score };
}

export function deriveUserCrmFields(row: UserLike) {
  const reportCount = Number(row.report_count || 0);
  const missing_fields = [
    row.full_name ? null : 'Ad soyad eksik',
    row.email ? null : 'E-posta eksik',
    row.two_factor_enabled ? null : '2FA kapalı',
  ].filter(Boolean) as string[];

  const risk_flags = {
    missingName: !row.full_name,
    missingEmail: !row.email,
    twoFactorDisabled: !row.two_factor_enabled,
    reported: reportCount > 0,
    inactive: !!row.status && row.status !== 'active',
    elevatedRole: ['admin', 'moderator'].includes(String(row.role || '')),
  };

  const health_score = Math.max(
    0,
    100 - missing_fields.length * 16 - (risk_flags.reported ? 12 : 0) - (risk_flags.inactive ? 8 : 0),
  );

  return { missing_fields, risk_flags, health_score };
}

export function deriveMatchProfileCrmFields(row: MatchProfileLike) {
  const completeness = Number(row.profile_completeness || 0);
  const photoCount = Array.isArray(row.photos) ? row.photos.length : 0;
  const missing_fields = [
    row.bio && String(row.bio).trim().length >= 40 ? null : 'Bio zayıf',
    row.preferred_district ? null : 'İlçe eksik',
    row.looking_for ? null : 'Aradığı kişi bilgisi eksik',
    photoCount > 0 ? null : 'Fotoğraf eksik',
    completeness >= 70 ? null : 'Profil tamamlanma düşük',
  ].filter(Boolean) as string[];

  const risk_flags = {
    weakBio: !(row.bio && String(row.bio).trim().length >= 40),
    missingDistrict: !row.preferred_district,
    missingIntent: !row.looking_for,
    missingPhotos: !(photoCount > 0),
    lowCompleteness: completeness < 70,
    hiddenProfile: !row.is_discoverable,
    userInactive: !!row.user_status && row.user_status !== 'active',
  };

  const health_score = Math.max(
    0,
    100 -
      missing_fields.length * 14 -
      (risk_flags.hiddenProfile ? 6 : 0) -
      (risk_flags.userInactive ? 8 : 0),
  );

  return { missing_fields, risk_flags, health_score };
}

export function deriveReportCrmFields(row: ReportLike) {
  const isResolved = !!row.resolved_at || ['resolved', 'dismissed'].includes(String(row.status || ''));
  const missing_fields = [
    row.reason ? null : 'Sebep eksik',
    row.description && String(row.description).trim().length >= 20 ? null : 'Açıklama zayıf',
    isResolved ? (row.resolution_note ? null : 'Çözüm notu eksik') : null,
  ].filter(Boolean) as string[];

  const risk_flags = {
    missingReason: !row.reason,
    weakDescription: !(row.description && String(row.description).trim().length >= 20),
    openReport: !isResolved,
    messageReport: row.content_type === 'message',
    missingResolution: isResolved && !row.resolution_note,
  };

  const health_score = Math.max(
    0,
    100 -
      missing_fields.length * 18 -
      (risk_flags.openReport ? 10 : 0) -
      (risk_flags.messageReport ? 4 : 0),
  );

  return { missing_fields, risk_flags, health_score };
}

export function deriveMessageCrmFields(row: MessageLike) {
  const missing_fields = [
    row.email ? null : 'E-posta eksik',
    row.subject ? null : 'Konu eksik',
    row.body && String(row.body).trim().length >= 20 ? null : 'Mesaj zayıf',
    row.name ? null : 'İsim eksik',
  ].filter(Boolean) as string[];

  const risk_flags = {
    missingEmail: !row.email,
    missingSubject: !row.subject,
    weakBody: !(row.body && String(row.body).trim().length >= 20),
    missingName: !row.name,
    unread: row.status === 'unread',
    openThread: !!row.status && !['closed', 'resolved', 'archived'].includes(String(row.status)),
  };

  const health_score = Math.max(
    0,
    100 -
      missing_fields.length * 16 -
      (risk_flags.unread ? 6 : 0) -
      (risk_flags.openThread ? 4 : 0),
  );

  return { missing_fields, risk_flags, health_score };
}
