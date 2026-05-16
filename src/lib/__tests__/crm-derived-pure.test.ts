import { describe, expect, it } from 'vitest';

import {
  deriveAdCrmFields,
  deriveEventCrmFields,
  deriveMatchProfileCrmFields,
  deriveMessageCrmFields,
  derivePharmacyCrmFields,
  derivePlaceCrmFields,
  deriveReportCrmFields,
  deriveReviewCrmFields,
  deriveSeoPageCrmFields,
  deriveUserCrmFields,
} from '../admin/crm-derived';

describe('crm derived helpers', () => {
  it('derives event missing fields and score', () => {
    const result = deriveEventCrmFields({
      description: '',
      image_url: null,
      start_date: null,
      location: 'Sanliurfa',
      category: '',
      status: 'draft',
    });
    expect(result.missing_fields.length).toBeGreaterThanOrEqual(4);
    expect(result.health_score).toBeLessThan(50);
  });

  it('derives pharmacy missing fields and score', () => {
    const result = derivePharmacyCrmFields({
      phone: '',
      address: '',
      latitude: null,
      longitude: null,
      duty_date: null,
      district_id: null,
      is_on_duty: false,
    });
    expect(result.missing_fields).toContain('Telefon eksik');
    expect(result.health_score).toBeLessThan(50);
  });

  it('derives seo page state and score', () => {
    const result = deriveSeoPageCrmFields({
      title: 'Kisa',
      meta_title: '',
      meta_description: '',
      heading: '',
      intro_text: '',
      is_active: false,
    });
    expect(result.seo_state).toBe('critical');
    expect(result.missing_fields.length).toBeGreaterThan(3);
  });

  it('derives place crm fields and score', () => {
    const result = derivePlaceCrmFields({
      meta_description: '',
      image_url: null,
      latitude: null,
      longitude: null,
      district_id: null,
      address: '',
      status: 'pending',
    });
    expect(result.missing_fields).toContain('SEO eksik');
    expect(result.missing_fields).toContain('Görsel eksik');
    expect(result.health_score).toBeLessThan(40);
  });

  it('derives review crm fields and flags', () => {
    const result = deriveReviewCrmFields({
      content: 'Kısa',
      rating: 0,
      status: 'flagged',
      is_moderated: false,
      is_hidden: true,
      is_verified: false,
    });
    expect(result.missing_fields).toContain('İçerik zayıf');
    expect(result.risk_flags.flagged).toBe(true);
    expect(result.health_score).toBeLessThan(40);
  });

  it('derives ad crm fields and detects low ctr', () => {
    const result = deriveAdCrmFields({
      budget: null,
      ended_at: null,
      place_id: null,
      status: 'draft',
      started_at: null,
      impressions: 250,
      clicks: 0,
    });
    expect(result.missing_fields).toContain('Bütçe eksik');
    expect(result.risk_flags.lowCtr).toBe(true);
    expect(result.health_score).toBeLessThan(40);
  });

  it('derives user crm fields and report risk', () => {
    const result = deriveUserCrmFields({
      full_name: '',
      email: '',
      status: 'suspended',
      report_count: 3,
      two_factor_enabled: false,
      role: 'user',
    });
    expect(result.missing_fields).toContain('Ad soyad eksik');
    expect(result.risk_flags.reported).toBe(true);
    expect(result.health_score).toBeLessThan(50);
  });

  it('derives match profile crm fields and completeness risk', () => {
    const result = deriveMatchProfileCrmFields({
      bio: 'Kısa bio',
      preferred_district: '',
      looking_for: '',
      profile_completeness: 35,
      photos: [],
      is_discoverable: false,
      user_status: 'suspended',
    });
    expect(result.missing_fields).toContain('Bio zayıf');
    expect(result.missing_fields).toContain('Fotoğraf eksik');
    expect(result.health_score).toBeLessThan(40);
  });

  it('derives report crm fields and open report risk', () => {
    const result = deriveReportCrmFields({
      reason: '',
      description: 'Kısa',
      status: 'open',
      content_type: 'message',
      resolution_note: '',
      resolved_at: null,
    });
    expect(result.missing_fields).toContain('Sebep eksik');
    expect(result.risk_flags.openReport).toBe(true);
    expect(result.health_score).toBeLessThan(50);
  });

  it('derives message crm fields and unread risk', () => {
    const result = deriveMessageCrmFields({
      email: '',
      body: 'Kısa',
      subject: '',
      status: 'unread',
      name: '',
    });
    expect(result.missing_fields).toContain('E-posta eksik');
    expect(result.risk_flags.unread).toBe(true);
    expect(result.health_score).toBeLessThan(40);
  });
});
