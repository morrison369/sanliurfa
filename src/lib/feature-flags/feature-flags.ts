/**
 * Feature flags system
 */

import { generateId } from '../utils';

export type FlagType = 'boolean' | 'percentage' | 'user' | 'group';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  type: FlagType;
  value: boolean | number | string[];
  defaultValue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserContext {
  userId?: string;
  groups?: string[];
}

const flagStore: Map<string, FeatureFlag> = new Map();

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    id: 'flag_1',
    key: 'new_search',
    name: 'New Search Interface',
    type: 'percentage',
    value: 50,
    defaultValue: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'flag_2',
    key: 'dark_mode',
    name: 'Dark Mode',
    type: 'boolean',
    value: true,
    defaultValue: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function initFeatureFlags(): void {
  for (const flag of DEFAULT_FLAGS) {
    flagStore.set(flag.key, flag);
  }
}

export function isEnabled(key: string, context?: UserContext): boolean {
  const flag = flagStore.get(key);
  if (!flag) return false;
  
  switch (flag.type) {
    case 'boolean':
      return flag.value as boolean;
    case 'percentage':
      return checkPercentage(flag.value as number, context?.userId);
    case 'user':
      return context?.userId ? (flag.value as string[]).includes(context.userId) : false;
    case 'group':
      return context?.groups?.some(g => (flag.value as string[]).includes(g)) ?? false;
    default:
      return flag.defaultValue;
  }
}

function checkPercentage(percentage: number, userId?: string): boolean {
  if (!userId) return Math.random() * 100 < percentage;
  return (hashString(userId) % 100) < percentage;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getAllFlags(context?: UserContext): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of flagStore.keys()) {
    result[key] = isEnabled(key, context);
  }
  return result;
}

export function listFlags(): FeatureFlag[] {
  return Array.from(flagStore.values());
}

export function updateFlag(key: string, updates: Partial<FeatureFlag>): FeatureFlag | null {
  const flag = flagStore.get(key);
  if (!flag) return null;
  
  const updated = { ...flag, ...updates, updatedAt: new Date().toISOString() };
  flagStore.set(key, updated);
  return updated;
}

export function deleteFlag(key: string): boolean {
  return flagStore.delete(key);
}

export function createFlag(
  key: string,
  name: string,
  type: FlagType,
  value: boolean | number | string[]
): FeatureFlag {
  const flag: FeatureFlag = {
    id: generateId(),
    key,
    name,
    type,
    value,
    defaultValue: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  flagStore.set(key, flag);
  return flag;
}

export function getFlagStats(): { total: number; byType: Record<FlagType, number>; enabled: number } {
  const byType: Record<FlagType, number> = { boolean: 0, percentage: 0, user: 0, group: 0 };
  let enabled = 0;
  
  for (const flag of flagStore.values()) {
    byType[flag.type]++;
    if (isEnabled(flag.key)) enabled++;
  }
  
  return { total: flagStore.size, byType, enabled };
}

initFeatureFlags();
