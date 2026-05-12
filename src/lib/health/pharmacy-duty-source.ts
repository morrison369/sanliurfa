import { load } from 'cheerio';

export const OFFICIAL_PHARMACY_SOURCE_URL =
  'https://sanliurfaeo.birodam.org.tr/index.php/nobetci-eczaneler/';

export type PharmacyDutyEntry = {
  name: string;
  districtLabel: string | null;
  address: string;
  phone: string | null;
  dutyDate: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
};

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function isPhoneText(value: string): boolean {
  const digitCount = value.replace(/\D/g, '').length;
  return digitCount >= 10 && /^[+\d\s()/-]+$/.test(value);
}

function normalizePhone(value: string): string {
  return cleanText(value.replace(/^tel[:\s-]*/i, ''));
}

function parseDutyDate(value: string): string | null {
  const match = value.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function parseCoordsFromMapHref(value: string | undefined): {
  latitude: number | null;
  longitude: number | null;
} {
  if (!value) {
    return { latitude: null, longitude: null };
  }

  try {
    const url = new URL(value);
    const query = url.searchParams.get('q');
    if (!query || query === 'null,null') {
      return { latitude: null, longitude: null };
    }

    const [latRaw, lngRaw] = query.split(',');
    const latitude = Number(latRaw);
    const longitude = Number(lngRaw);

    return {
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    };
  } catch {
    return { latitude: null, longitude: null };
  }
}

export function parseOfficialPharmacyDutyHtml(html: string): PharmacyDutyEntry[] {
  const $ = load(html);
  const cards = $('[data-elementor-type="loop-item"].e-loop-item');
  const entries: PharmacyDutyEntry[] = [];
  const seen = new Set<string>();

  cards.each((_, element) => {
    const card = $(element);
    const headings = card
      .find('.elementor-widget-heading .elementor-heading-title')
      .map((__, node) => cleanText($(node).text()))
      .get()
      .filter(Boolean);

    const textBlocks = card
      .find('.elementor-widget-text-editor')
      .map((__, node) => cleanText($(node).text()))
      .get()
      .filter(Boolean);

    const name = headings[0] || '';
    const districtLabel = headings[1]
      ? cleanText(headings[1].replace(/[()]/g, ''))
      : null;

    let address = '';
    let phone: string | null = null;
    let dutyDate: string | null = null;

    for (const block of textBlocks) {
      if (!dutyDate) {
        const parsedDate = parseDutyDate(block);
        if (parsedDate) {
          dutyDate = parsedDate;
          continue;
        }
      }

      if (!phone && isPhoneText(block)) {
        phone = normalizePhone(block);
        continue;
      }

      if (!address) {
        address = block;
      }
    }

    const mapUrl = card.find('a[href*="google.com/maps"]').first().attr('href') || null;
    const { latitude, longitude } = parseCoordsFromMapHref(mapUrl || undefined);

    if (!name || !address) {
      return;
    }

    const uniqueKey = `${name.toLocaleLowerCase('tr-TR')}|${address.toLocaleLowerCase('tr-TR')}|${dutyDate || ''}`;
    if (seen.has(uniqueKey)) {
      return;
    }
    seen.add(uniqueKey);

    entries.push({
      name,
      districtLabel,
      address,
      phone,
      dutyDate,
      latitude,
      longitude,
      mapUrl,
    });
  });

  return entries;
}

export function getLatestPharmacyDutyDate(entries: PharmacyDutyEntry[]): string | null {
  return entries
    .map((entry) => entry.dutyDate)
    .filter((value): value is string => Boolean(value))
    .sort()
    .pop() || null;
}

export async function fetchOfficialPharmacyDutyEntries(
  sourceUrl = OFFICIAL_PHARMACY_SOURCE_URL,
): Promise<PharmacyDutyEntry[]> {
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent': 'Sanliurfa.com pharmacy refresh (+https://sanliurfa.com)',
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`pharmacy_source_http_${response.status}`);
  }

  const html = await response.text();
  const entries = parseOfficialPharmacyDutyHtml(html);
  if (entries.length === 0) {
    throw new Error('pharmacy_source_empty');
  }

  return entries;
}
