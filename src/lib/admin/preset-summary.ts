type PresetLike = {
  tags: string[];
  keys: string[];
};

export type PresetScopeFilter = 'all' | 'landing' | 'style' | 'ops';

export function getPresetScopeCounts(presets: PresetLike[]) {
  return {
    all: presets.length,
    landing: presets.filter((preset) => preset.keys.some((key) => key.startsWith('homepage.'))).length,
    style: presets.filter((preset) => preset.tags.includes('style')).length,
    ops: presets.filter((preset) => preset.tags.includes('operations')).length,
  };
}

export function getPresetScopeLabel(scope: PresetScopeFilter) {
  if (scope === 'landing') return 'Landing Odaklı';
  if (scope === 'style') return 'Style / Theme';
  if (scope === 'ops') return 'Ops / Service';
  return 'Tüm Kapsamlar';
}

export function getPresetScopeDescription(scope: PresetScopeFilter) {
  if (scope === 'landing') return 'Homepage.* anahtarları içeren landing presetleri gösterilir.';
  if (scope === 'style') return 'Tema, section style ve görsel dil odaklı presetler gösterilir.';
  if (scope === 'ops') return 'Servis, operasyon ve yoğun bilgi akışı odaklı presetler gösterilir.';
  return 'Tüm preset havuzu görünür.';
}

export function presetMatchesScope(preset: PresetLike, scope: PresetScopeFilter) {
  if (scope === 'landing') return preset.keys.some((key) => key.startsWith('homepage.'));
  if (scope === 'style') return preset.tags.includes('style');
  if (scope === 'ops') return preset.tags.includes('operations');
  return true;
}

export function getPresetCardScopeLabel(preset: PresetLike) {
  const scopes: string[] = [];
  if (preset.keys.some((key) => key.startsWith('homepage.'))) scopes.push('Landing');
  if (preset.tags.includes('style')) scopes.push('Style');
  if (preset.tags.includes('operations')) scopes.push('Ops');
  return scopes.length > 0 ? scopes.join(' · ') : 'Genel';
}

export function getPresetKeyBreakdown(preset: PresetLike) {
  const homepageKeys = preset.keys.filter((key) => key.startsWith('homepage.')).length;
  return {
    homepageKeys,
    otherKeys: preset.keys.length - homepageKeys,
  };
}
