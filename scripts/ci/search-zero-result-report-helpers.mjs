export function normalizeSearchReportKey(value) {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c');
}

function addVariantKeys(target, value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return;
  }

  target.add(normalizeSearchReportKey(raw));
  target.add(normalizeSearchReportKey(raw.replace(/[-_]+/g, ' ')));
  target.add(normalizeSearchReportKey(raw.replace(/\s+/g, '-')));
}

export function buildResolvablePlaceKeys({ placeRows = [], contentPlaceSlugs = [] } = {}) {
  const keys = new Set();

  for (const row of placeRows) {
    addVariantKeys(keys, row?.slug);
    addVariantKeys(keys, row?.name);
  }

  for (const slug of contentPlaceSlugs) {
    addVariantKeys(keys, slug);
  }

  keys.delete('');
  return keys;
}

export function getAutoResolvedZeroResultRows(rows, resolvablePlaceKeys) {
  return rows.filter((row) => {
    const searchType = String(row?.search_type ?? 'places');
    if (searchType !== 'places') {
      return false;
    }

    const normalizedQuery = normalizeSearchReportKey(row?.search_query ?? '');
    return normalizedQuery !== '' && resolvablePlaceKeys.has(normalizedQuery);
  });
}
