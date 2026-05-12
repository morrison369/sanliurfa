import type { PresetScopeFilter } from './preset-summary';

export type PresetStorageState = {
  quickFilter: string;
  quickGroup: string;
  jsonExpanded: boolean;
  selectedPresetId: string;
  presetTagFilter: string;
  presetScopeFilter: PresetScopeFilter;
  presetMode: 'draft' | 'publish';
};

const STORAGE_KEYS = {
  quickFilter: 'siteContent.quickFilter',
  quickGroup: 'siteContent.quickGroup',
  jsonExpanded: 'siteContent.jsonExpanded',
  selectedPresetId: 'siteContent.selectedPresetId',
  presetTagFilter: 'siteContent.presetTagFilter',
  presetScopeFilter: 'siteContent.presetScopeFilter',
  presetMode: 'siteContent.presetMode',
} as const;

export function loadPresetStorageState(): Partial<PresetStorageState> {
  const state: Partial<PresetStorageState> = {};
  try {
    const quickFilter = window.localStorage.getItem(STORAGE_KEYS.quickFilter);
    const quickGroup = window.localStorage.getItem(STORAGE_KEYS.quickGroup);
    const jsonExpanded = window.localStorage.getItem(STORAGE_KEYS.jsonExpanded);
    const selectedPresetId = window.localStorage.getItem(STORAGE_KEYS.selectedPresetId);
    const presetTagFilter = window.localStorage.getItem(STORAGE_KEYS.presetTagFilter);
    const presetScopeFilter = window.localStorage.getItem(STORAGE_KEYS.presetScopeFilter);
    const presetMode = window.localStorage.getItem(STORAGE_KEYS.presetMode);

    if (quickFilter) state.quickFilter = quickFilter;
    if (quickGroup) state.quickGroup = quickGroup;
    if (jsonExpanded === 'true') state.jsonExpanded = true;
    if (selectedPresetId) state.selectedPresetId = selectedPresetId;
    if (presetTagFilter) state.presetTagFilter = presetTagFilter;
    if (
      presetScopeFilter === 'all' ||
      presetScopeFilter === 'landing' ||
      presetScopeFilter === 'style' ||
      presetScopeFilter === 'ops'
    ) {
      state.presetScopeFilter = presetScopeFilter;
    }
    if (presetMode === 'draft' || presetMode === 'publish') state.presetMode = presetMode;
  } catch {
    return state;
  }
  return state;
}

export function savePresetStorageState(state: PresetStorageState) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.quickFilter, state.quickFilter);
    window.localStorage.setItem(STORAGE_KEYS.quickGroup, state.quickGroup);
    window.localStorage.setItem(STORAGE_KEYS.jsonExpanded, String(state.jsonExpanded));
    window.localStorage.setItem(STORAGE_KEYS.selectedPresetId, state.selectedPresetId);
    window.localStorage.setItem(STORAGE_KEYS.presetTagFilter, state.presetTagFilter);
    window.localStorage.setItem(STORAGE_KEYS.presetScopeFilter, state.presetScopeFilter);
    window.localStorage.setItem(STORAGE_KEYS.presetMode, state.presetMode);
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}
