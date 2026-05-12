import { describe, expect, it } from 'vitest';

import {
  getPresetCardScopeLabel,
  getPresetKeyBreakdown,
  getPresetScopeCounts,
  getPresetScopeDescription,
  getPresetScopeLabel,
  presetMatchesScope,
} from '../admin/preset-summary';

const presets = [
  {
    tags: ['landing', 'style'],
    keys: ['homepage.hero', 'homepage.theme', 'header.brand'],
  },
  {
    tags: ['operations', 'service'],
    keys: ['places.sla', 'transport.status'],
  },
];

describe('admin preset summary helpers', () => {
  it('counts presets by scope', () => {
    expect(getPresetScopeCounts(presets)).toEqual({
      all: 2,
      landing: 1,
      style: 1,
      ops: 1,
    });
  });

  it('returns readable scope labels and descriptions', () => {
    expect(getPresetScopeLabel('landing')).toBe('Landing Odaklı');
    expect(getPresetScopeLabel('style')).toBe('Style / Theme');
    expect(getPresetScopeLabel('ops')).toBe('Ops / Service');
    expect(getPresetScopeDescription('all')).toContain('Tüm preset havuzu');
    expect(getPresetScopeDescription('ops')).toContain('Servis, operasyon');
  });

  it('matches presets to active scope', () => {
    expect(presetMatchesScope(presets[0], 'landing')).toBe(true);
    expect(presetMatchesScope(presets[0], 'ops')).toBe(false);
    expect(presetMatchesScope(presets[1], 'ops')).toBe(true);
    expect(presetMatchesScope(presets[1], 'all')).toBe(true);
  });

  it('builds preset card scope labels and key breakdown', () => {
    expect(getPresetCardScopeLabel(presets[0])).toBe('Landing · Style');
    expect(getPresetCardScopeLabel(presets[1])).toBe('Ops');
    expect(getPresetKeyBreakdown(presets[0])).toEqual({
      homepageKeys: 2,
      otherKeys: 1,
    });
  });
});
