const synonymGroups = [
  ['göbeklitepe', 'gobeklitepe', 'göbekli tepe', 'gobekli tepe'],
  ['balıklıgöl', 'balikligol', 'balıklı gol', 'balikli gol'],
  ['sıra gecesi', 'sira gecesi', 'sıragecesi', 'siragecesi'],
  ['ciğer', 'ciger', 'ciğerciler', 'cigerciler', 'ciğerci', 'cigerci'],
  ['kebap', 'urfa kebap', 'kebapçı', 'kebapci', 'kebapçılar', 'kebapcilar'],
];

function normalizeBase(value: string): string {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAscii(value: string): string {
  return normalizeBase(value)
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c');
}

const lookup = new Map<string, string[]>();

for (const group of synonymGroups) {
  const normalizedGroup = Array.from(
    new Set(group.map((entry) => normalizeBase(entry)).filter(Boolean)),
  );

  for (const entry of normalizedGroup) {
    lookup.set(entry, normalizedGroup);
    lookup.set(normalizeAscii(entry), normalizedGroup);
  }
}

export function expandSearchQueryVariants(query: string, limit: number = 6): string[] {
  const normalizedQuery = normalizeBase(query);
  if (!normalizedQuery) {
    return [];
  }

  const asciiQuery = normalizeAscii(normalizedQuery);
  const variants = new Set<string>([normalizedQuery]);

  const directMatch = lookup.get(normalizedQuery) || lookup.get(asciiQuery);
  if (directMatch) {
    for (const entry of directMatch) {
      variants.add(entry);
    }
  }

  for (const group of synonymGroups) {
    const normalizedGroup = group.map((entry) => normalizeBase(entry));
    const groupMatches = normalizedGroup.some((entry) => {
      if (entry.length < 4) {
        return false;
      }
      const asciiEntry = normalizeAscii(entry);
      return (
        normalizedQuery.includes(entry) ||
        entry.includes(normalizedQuery) ||
        asciiQuery.includes(asciiEntry) ||
        asciiEntry.includes(asciiQuery)
      );
    });

    if (groupMatches) {
      for (const entry of normalizedGroup) {
        variants.add(entry);
      }
    }
  }

  return Array.from(variants).slice(0, limit);
}

export function canonicalizeSearchQuery(query: string): string {
  const normalizedQuery = normalizeBase(query);
  if (!normalizedQuery) {
    return normalizedQuery;
  }

  const directMatch = lookup.get(normalizedQuery) || lookup.get(normalizeAscii(normalizedQuery));
  if (directMatch && directMatch.length > 0) {
    return directMatch[0];
  }

  const variants = expandSearchQueryVariants(query, 1);
  return variants[0] || normalizedQuery;
}
