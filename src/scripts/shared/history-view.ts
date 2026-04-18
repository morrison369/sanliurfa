type DatasetBackedRoot = HTMLElement & { dataset: DOMStringMap };

export function readStoredDatasetValue(
  root: DatasetBackedRoot,
  datasetKey: string,
  storageKey: string,
): string {
  const datasetValue = root.dataset[datasetKey];
  if (datasetValue) return datasetValue;

  try {
    return window.localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}

export function writeStoredDatasetValue(
  root: DatasetBackedRoot,
  datasetKey: string,
  storageKey: string,
  value: string,
) {
  root.dataset[datasetKey] = value;

  try {
    if (value) {
      window.localStorage.setItem(storageKey, value);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // no-op
  }
}

export function readJsonArray<T>(root: DatasetBackedRoot, datasetKey: string): T[] {
  const raw = root.dataset[datasetKey];
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeJsonArray(root: DatasetBackedRoot, datasetKey: string, items: unknown[]) {
  root.dataset[datasetKey] = JSON.stringify(items);
}

export function exportCsvView(
  filename: string,
  header: string[],
  rows: Array<Array<string | number>>,
) {
  if (rows.length === 0) return;

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
