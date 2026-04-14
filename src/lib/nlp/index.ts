/**
 * Natural Language Processing Module
 * Turkish text analysis and processing
 */

// Turkish stop words
const STOP_WORDS = new Set([
  'bir', 've', 'bu', 'da', 'de', 'mi', 'icin', 'ile', 'ki', 'cok',
  'ama', 'gibi', 'her', 'sonra', 'daha', 'en', 'ya', 'ki', 'icinde',
  'ise', 'hem', 'ya', 'ya da', 'hic', 'bile', 'ise', 'oysa', 'halde',
  'kadar', 'beri', 'gore', 'karsi', 'ragmen', 'baska', 'once', 'simdi',
  'burada', 'orada', 'nerede', 'nereye', 'nasıl', 'ne', 'kim', 'hangi',
  'butun', 'bazi', 'tum', 'hicbir', 'baska', 'kendi', 'ben', 'sen',
  'o', 'biz', 'siz', 'onlar', 'benim', 'senin', 'onun', 'bizim',
  'sizin', 'onlarin', 'bana', 'sana', 'ona', 'bize', 'size', 'onlara'
]);

// Turkish character mappings for normalization
const TR_CHAR_MAP: Record<string, string> = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',
  'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',
  'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
};

export interface TokenizeResult {
  tokens: string[];
  bigrams: string[];
  trigrams: string[];
}

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface Entity {
  text: string;
  type: 'location' | 'person' | 'organization' | 'time' | 'number' | 'unknown';
  start: number;
  end: number;
}

/**
 * Tokenize Turkish text
 */
export function tokenize(text: string): TokenizeResult {
  const normalized = normalizeText(text);
  
  // Split into words (already normalized/lowercased)
  const tokens = normalized
    .replace(/[^a-z0-9çğıöşüâ]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));

  // Generate n-grams
  const bigrams: string[] = [];
  const trigrams: string[] = [];

  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }

  for (let i = 0; i < tokens.length - 2; i++) {
    trigrams.push(`${tokens[i]}_${tokens[i + 1]}_${tokens[i + 2]}`);
  }

  return { tokens, bigrams, trigrams };
}

/**
 * Normalize Turkish text
 */
export function normalizeText(text: string): string {
  let normalized = text;

  // Fix encoding issues
  for (const [bad, good] of Object.entries(TR_CHAR_MAP)) {
    normalized = normalized.replace(new RegExp(bad, 'g'), good);
  }

  // Lowercase (preserve Turkish I with locale)
  normalized = normalized.toLocaleLowerCase('tr-TR');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string, topN: number = 10): string[] {
  const { tokens, bigrams } = tokenize(text);
  
  // Count frequency
  const freq = new Map<string, number>();
  
  tokens.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
  bigrams.forEach(b => freq.set(b, (freq.get(b) || 0) + 2)); // Boost bigrams

  // Sort by frequency and return top N
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word.replace(/_/g, ' '));
}

/**
 * Calculate text similarity using Jaccard index
 */
export function textSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1).tokens);
  const tokens2 = new Set(tokenize(text2).tokens);

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Simple Turkish sentiment analysis
 */
export function analyzeSentiment(text: string): SentimentResult {
  const normalized = normalizeText(text);
  
  // Positive and negative word lists (simplified)
  const positiveWords = new Set([
    'guzel', 'harika', 'mukemmel', 'muhtesem', 'super', 'iyi', 'basarili',
    'muazzam', 'sahane', 'muthis', 'kaliteli', 'temiz', 'rahat', 'hos',
    'memnun', 'keyifli', 'lezzetli', 'taze', 'sicak', 'samimi', 'profesyonel',
    'hizli', 'uygun', 'ekonomik', 'dolu', 'tavsiye', 'tekrar', 'siddetle'
  ]);

  const negativeWords = new Set([
    'kotu', 'berbat', 'rezil', 'igrenc', 'korkunc', 'yavas', 'pahali',
    'kirli', 'bozuk', 'soguk', 'tatsiz', 'bayat', 'kaba', 'ilgisiz',
    'eksik', 'hayal', 'korkunc', 'berbat', 'rezalet', 'skandal', 'yalan'
  ]);

  const tokens = tokenize(text).tokens;
  
  let positive = 0;
  let negative = 0;

  tokens.forEach(token => {
    if (positiveWords.has(token)) positive++;
    if (negativeWords.has(token)) negative++;
  });

  // Check for negation
  const negationPattern = /(degil|yok|ama|fakat|ancak)/;
  if (negationPattern.test(normalized)) {
    // Flip sentiment if negation detected
    [positive, negative] = [negative * 0.5, positive * 0.5];
  }

  const total = positive + negative;
  if (total === 0) {
    return { score: 0, label: 'neutral', confidence: 1 };
  }

  const score = (positive - negative) / total;
  const label = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
  const confidence = Math.abs(score);

  return { score, label, confidence };
}

/**
 * Extract entities from text
 */
export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];

  // Location patterns
  const locationPatterns = [
    /(\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+(?:Mahallesi?|Mh\.?|Mah\.?)\b)/g,
    /(\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+(?:Sokak|Sok\.?|Sk\.?|Cadde|Cd\.?|Bulvar|Blv\.?)\b)/g,
    /(\b(?:Haliliye|Karakopru|Eyyubiye|Birecik|Siverek|Viransehir|Suruc|Harran)\b)/gi,
  ];

  locationPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'location',
        start: match.index,
        end: match.index + match[1].length,
      });
    }
  });

  // Time patterns
  const timePatterns = [
    /(\d{1,2}[\:\.]\d{2}(?:\s*[AaPp][Mm])?)/g,
    /(\d{1,2}\s*(?:saat|s)\b)/gi,
    /(\d{1,2}\s*(?:dakika|dk|d)\b)/gi,
  ];

  timePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'time',
        start: match.index,
        end: match.index + match[1].length,
      });
    }
  });

  // Number patterns (prices, phone numbers)
  const numberPatterns = [
    /(\d{1,3}(?:[.,]\d{3})*\s*(?:TL|₺|\$|€))/g,
    /(\d{3}[-.]\d{3}[-.]\d{4})/g, // Phone
  ];

  numberPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'number',
        start: match.index,
        end: match.index + match[1].length,
      });
    }
  });

  return entities;
}

/**
 * Detect language (simple Turkish detection)
 */
export function detectLanguage(text: string): { language: string; confidence: number } {
  const trChars = /[çğıöşüÇĞİÖŞÜ]/;
  const trWords = /\b(ve|bir|bu|icin|ile|da|de|cok|ama|gibi|her|sonra|icinde)\b/i;
  
  const trCharCount = (text.match(trChars) || []).length;
  const trWordCount = (text.match(trWords) || []).length;
  
  const score = (trCharCount * 2 + trWordCount * 5) / text.length;
  
  if (score > 0.05) {
    return { language: 'tr', confidence: Math.min(score * 2, 1) };
  }
  
  return { language: 'unknown', confidence: 1 - score };
}

/**
 * Summarize text
 */
export function summarize(text: string, maxSentences: number = 3): string {
  // Split into sentences
  const sentences = text
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .filter(s => s.trim().length > 10);

  if (sentences.length <= maxSentences) {
    return text;
  }

  // Score sentences by keyword density
  const keywords = new Set(extractKeywords(text, 20));
  
  const scored = sentences.map(sentence => {
    const tokens = tokenize(sentence).tokens;
    const keywordCount = tokens.filter(t => keywords.has(t)).length;
    return { sentence, score: keywordCount / tokens.length };
  });

  // Get top sentences by score, preserving original order
  const topSentences = scored
    .map((s, i) => ({ ...s, index: i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index);

  return topSentences.map(s => s.sentence).join('. ') + '.';
}

/**
 * Generate search suggestions based on query
 */
export function generateSearchSuggestions(query: string): string[] {
  const normalized = normalizeText(query);
  const suggestions: string[] = [];

  // Category suggestions
  const categories = [
    'restoran', 'kafe', 'otel', 'dukkan', 'park', 'hastane', 'eczane',
    'okul', 'universite', 'sinema', 'spor', 'alisveris', 'market'
  ];

  categories.forEach(cat => {
    if (!normalized.includes(cat)) {
      suggestions.push(`${normalized} ${cat}`);
    }
  });

  // Location suggestions
  const locations = [
    'Haliliye', 'Karakopru', 'Eyyubiye', 'Birecik', 'Siverek', 
    'Viransehir', 'Suruc', 'Harran', 'merkez'
  ];

  locations.forEach(loc => {
    if (!normalized.toLowerCase().includes(loc.toLowerCase())) {
      suggestions.push(`${normalized} ${loc}`);
    }
  });

  return suggestions.slice(0, 5);
}

/**
 * Spell check (simple Turkish)
 */
export function spellCheck(word: string): { correct: boolean; suggestions: string[] } {
  const dictionary = new Set([
    'sanliurfa', 'urfa', 'balikligol', 'golbasi', 'cay', 'kebap',
    'lahmacun', 'baklava', 'sira', 'cigkofte', 'fistik', 'biber', 'patlican'
  ]);

  const normalized = word.toLowerCase().trim();

  if (dictionary.has(normalized)) {
    return { correct: true, suggestions: [] };
  }

  // Simple edit distance suggestions
  const suggestions = Array.from(dictionary)
    .filter(w => levenshteinDistance(normalized, w) <= 2)
    .slice(0, 3);

  return { correct: false, suggestions };
}

/**
 * Levenshtein distance for spell checking
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
