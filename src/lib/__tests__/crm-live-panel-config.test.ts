import { describe, expect, it } from 'vitest';
import {
  getControlPanelConfig,
  getLocationPanelConfig,
  getOpsPanelConfig,
  getSeoPanelConfig,
  getSocialPanelConfig,
} from '../admin/crm-live-panel-config';

describe('crm live panel config helpers', () => {
  it('location config mahalle icin kolon sayisini artirir', () => {
    const district = getLocationPanelConfig('locations/districts');
    const neighborhood = getLocationPanelConfig('locations/neighborhoods');
    expect(district.resource).toBe('districts');
    expect(district.columns).toBe(6);
    expect(neighborhood.resource).toBe('neighborhoods');
    expect(neighborhood.columns).toBe(7);
  });

  it('ops config events ve pharmacies farklarini korur', () => {
    const events = getOpsPanelConfig('events');
    const pharmacies = getOpsPanelConfig('pharmacies');
    expect(events.resource).toBe('events');
    expect(events.tertiaryColumn).toBe('Tarih / Durum');
    expect(events.filterOptions).toEqual(
      expect.arrayContaining([['upcoming', 'Yaklaşan']]),
    );
    expect(pharmacies.resource).toBe('pharmacies');
    expect(pharmacies.quaternaryColumn).toBe('Adres / İlçe');
    expect(pharmacies.filterOptions).toEqual(
      expect.arrayContaining([['phone-missing', 'Telefon eksik']]),
    );
  });

  it('control config her mod icin dogru resource ve filtreleri verir', () => {
    expect(getControlPanelConfig('reviews').resource).toBe('reviews');
    expect(getControlPanelConfig('ads').resource).toBe('ads');
    expect(getControlPanelConfig('map').resource).toBe('places');
    expect(getControlPanelConfig('map').filterOptions).toEqual(
      expect.arrayContaining([['district-missing', 'İlçe eksik']]),
    );
  });

  it('social config her mod icin dogru resource ve filtreleri verir', () => {
    expect(getSocialPanelConfig('community/users').resource).toBe('users');
    expect(getSocialPanelConfig('community/profiles').resource).toBe('match-profiles');
    expect(getSocialPanelConfig('community/reports').resource).toBe('reports');
    expect(getSocialPanelConfig('messages').resource).toBe('messages');
    expect(getSocialPanelConfig('messages').filterOptions).toEqual(
      expect.arrayContaining([['unread', 'Okunmamış']]),
    );
  });

  it('seo config ortak shell icin sabit resource ve filtreleri verir', () => {
    const config = getSeoPanelConfig();

    expect(config.resource).toBe('seo-pages');
    expect(config.filterOptions).toEqual([
      ['missing-title', 'Title/meta eksik'],
      ['missing-intro', 'Intro eksik'],
      ['inactive', 'Pasif'],
    ]);
  });
});
