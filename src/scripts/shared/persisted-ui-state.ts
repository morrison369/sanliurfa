type DatasetBackedRoot = HTMLElement & { dataset: DOMStringMap };

export function readStoredString(storageKey: string): string {
  try {
    return window.localStorage?.getItem(storageKey) ?? '';
  } catch {
    return '';
  }
}

export function writeStoredString(storageKey: string, value: string) {
  try {
    if (value) {
      window.localStorage?.setItem(storageKey, value);
    } else {
      window.localStorage?.removeItem(storageKey);
    }
  } catch {
    // no-op
  }
}

export function readStoredJsonArray(storageKey: string): string[] {
  try {
    const raw = window.localStorage?.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeStoredJsonArray(storageKey: string, values: string[], limit?: number) {
  const nextValues = typeof limit === 'number' ? values.slice(0, limit) : values;

  try {
    if (nextValues.length > 0) {
      window.localStorage?.setItem(storageKey, JSON.stringify(nextValues));
    } else {
      window.localStorage?.removeItem(storageKey);
    }
  } catch {
    // no-op
  }
}

export function readDatasetOrStoredTab<T extends string>(
  root: DatasetBackedRoot,
  datasetKey: string,
  storageKey: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const datasetValue = root.dataset[datasetKey];
  if (datasetValue && allowed.includes(datasetValue as T)) {
    return datasetValue as T;
  }

  const storedValue = readStoredString(storageKey);
  return allowed.includes(storedValue as T) ? (storedValue as T) : fallback;
}
