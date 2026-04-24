/**
 * Voice Search Module
 * Web Speech API integration for natural language search
 */

import { tokenize, extractEntities, analyzeSentiment } from '../nlp';

export interface VoiceSearchResult {
  query: string;
  confidence: number;
  entities: {
    locations: string[];
    categories: string[];
    priceRange?: { min?: number; max?: number };
    ratings?: { min?: number };
    features: string[];
  };
  intent: 'search' | 'navigate' | 'filter' | 'compare' | 'unknown';
  filters: SearchFilters;
}

export interface SearchFilters {
  category?: string;
  location?: string;
  minRating?: number;
  priceLevel?: 'cheap' | 'moderate' | 'expensive' | 'luxury';
  features?: string[];
  sortBy?: 'rating' | 'distance' | 'popularity' | 'newest';
  openNow?: boolean;
}

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

/**
 * Check if voice search is supported
 */
export function isVoiceSearchSupported(): boolean {
  return typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

/**
 * Create speech recognition instance
 */
export function createSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = 'tr-TR';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  return recognition;
}

/**
 * Start voice recording and return transcript
 */
export function startVoiceRecording(
  onResult: (transcript: string, isFinal: boolean, confidence: number) => void,
  onError?: (error: string) => void
): () => void {
  const recognition = createSpeechRecognition();
  if (!recognition) {
    onError?.('Voice search not supported');
    return () => {};
  }

  let finalTranscript = '';

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = '';

    for (let i = (event as any).resultIndex ?? 0; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      const confidence = event.results[i][0].confidence;

      if (event.results[i].isFinal) {
        finalTranscript += transcript;
        onResult(finalTranscript, true, confidence);
      } else {
        interimTranscript += transcript;
        onResult(interimTranscript, false, confidence);
      }
    }
  };

  recognition.onerror = (event: any) => {
    onError?.(event.error || 'Unknown error');
  };

  recognition.onend = () => {
    if (finalTranscript) {
      onResult(finalTranscript, true, 1);
    }
  };

  recognition.start();

  // Return cleanup function
  return () => {
    recognition.stop();
  };
}

/**
 * Parse natural language query
 */
export function parseNaturalLanguageQuery(query: string): VoiceSearchResult {
  const normalized = query.toLowerCase().trim();
  
  // Extract entities using NLP
  const entities = extractEntities(normalized);
  const tokens = tokenize(normalized);
  
  // Determine intent
  const intent = detectIntent(normalized);
  
  // Extract filters
  const filters = extractFilters(normalized, tokens);
  
  // Calculate confidence
  const confidence = calculateConfidence(normalized, tokens, entities);

  return {
    query: normalized,
    confidence,
    entities: {
      locations: extractLocations(normalized, entities),
      categories: extractCategories(normalized),
      priceRange: extractPriceRange(normalized),
      ratings: extractRatings(normalized),
      features: extractFeatures(normalized),
    },
    intent,
    filters,
  };
}

/**
 * Detect search intent
 */
function detectIntent(query: string): VoiceSearchResult['intent'] {
  const navigationPatterns = [
    /gitmek istiyorum/i,
    /nasıl giderim/i,
    /adres/i,
    /yol tarifi/i,
    /konum/i,
  ];

  const filterPatterns = [
    /sadece/i,
    /yalnızca/i,
    /filtre/i,
    /arama/i,
  ];

  const comparePatterns = [
    /karşılaştır/i,
    /hangisi/i,
    /vs\.?/i,
    /veya/i,
    /daha iyi/i,
  ];

  if (navigationPatterns.some(p => p.test(query))) return 'navigate';
  if (comparePatterns.some(p => p.test(query))) return 'compare';
  if (filterPatterns.some(p => p.test(query))) return 'filter';
  if (query.length > 3) return 'search';
  
  return 'unknown';
}

/**
 * Extract locations from query
 */
function extractLocations(query: string, entities: any[]): string[] {
  const locations: string[] = [];
  
  // From entities
  entities
    .filter(e => e.type === 'location')
    .forEach(e => locations.push(e.text));

  // From keywords
  const locationKeywords = [
    'haliliye', 'karaköprü', 'eyyübiye', 'birecik', 'siverek',
    'viranşehir', 'suruç', 'harran', 'merkez', 'akçakale',
    'ceylanpınar', 'harran üniversitesi', 'gölbaşı', 'balıklıgöl'
  ];

  locationKeywords.forEach(loc => {
    if (query.includes(loc)) {
      locations.push(loc);
    }
  });

  return [...new Set(locations)];
}

/**
 * Extract categories from query
 */
function extractCategories(query: string): string[] {
  const categories: string[] = [];
  
  const categoryKeywords: Record<string, string[]> = {
    'restaurant': ['restoran', 'lokanta', 'yemek', 'kebap', 'lahmacun'],
    'cafe': ['kafe', 'kahve', 'çay', 'kahvaltı'],
    'hotel': ['otel', 'pansiyon', 'konaklama'],
    'shopping': ['alışveriş', 'mağaza', 'dükkan', 'market'],
    'health': ['hastane', 'sağlık', 'klinik', 'doktor', 'eczane'],
    'education': ['okul', 'üniversite', 'kurs', 'eğitim'],
    'entertainment': ['sinema', 'eğlence', 'park', 'spor'],
  };

  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    if (keywords.some(k => query.includes(k))) {
      categories.push(category);
    }
  });

  return categories;
}

/**
 * Extract price range from query
 */
function extractPriceRange(query: string): { min?: number; max?: number } | undefined {
  const pricePatterns = [
    { pattern: /(\d+)\s*(?:tl|lira|₺)/i, extract: (m: RegExpMatchArray) => parseInt(m[1]) },
    { pattern: /(\d+)\s*(?:ile|ve|la)\s*(\d+)\s*(?:tl|lira|₺)/i, 
      extract: (m: RegExpMatchArray) => ({ min: parseInt(m[1]), max: parseInt(m[2]) }) },
  ];

  for (const { pattern, extract } of pricePatterns) {
    const match = query.match(pattern);
    if (match) {
      const result = extract(match);
      if (typeof result === 'number') {
        return { max: result };
      }
      return result;
    }
  }

  // Price level keywords
  if (/ucuz|ekonomik|uygun/i.test(query)) return { max: 100 };
  if (/pahalı|lüks|kaliteli/i.test(query)) return { min: 500 };
  
  return undefined;
}

/**
 * Extract ratings from query
 */
function extractRatings(query: string): { min?: number } | undefined {
  const ratingPatterns = [
    /(\d(?:\.\d)?)\s*(?:yıldız|puan|üzeri|üstü)/i,
    /en az (\d(?:\.\d)?)/i,
  ];

  for (const pattern of ratingPatterns) {
    const match = query.match(pattern);
    if (match) {
      return { min: parseFloat(match[1]) };
    }
  }

  if (/iyi|kaliteli|güzel/i.test(query)) return { min: 4 };
  if (/mükemmel|harika/i.test(query)) return { min: 4.5 };

  return undefined;
}

/**
 * Extract features from query
 */
function extractFeatures(query: string): string[] {
  const features: string[] = [];
  
  const featureKeywords: Record<string, string[]> = {
    'wifi': ['wifi', 'internet', 'wireless'],
    'parking': ['otopark', 'park yeri', 'park'],
    'outdoor': ['bahçe', 'teras', 'açık alan'],
    'accessible': ['engelli', 'erişilebilir', 'tekerlekli sandalye'],
    'family-friendly': ['çocuk', 'aile', 'bebek'],
    'pet-friendly': ['evcil hayvan', 'köpek', 'kedi', 'pet'],
    'delivery': ['paket servis', 'kurye', 'gel al'],
  };

  Object.entries(featureKeywords).forEach(([feature, keywords]) => {
    if (keywords.some(k => query.includes(k))) {
      features.push(feature);
    }
  });

  return features;
}

/**
 * Extract search filters
 */
function extractFilters(query: string, tokens: any): SearchFilters {
  const filters: SearchFilters = {};

  // Category
  const categories = extractCategories(query);
  if (categories.length > 0) {
    filters.category = categories[0];
  }

  // Location (from entities)
  const locations = extractLocations(query, []);
  if (locations.length > 0) {
    filters.location = locations[0];
  }

  // Price level
  const priceRange = extractPriceRange(query);
  if (priceRange) {
    if (priceRange.max && priceRange.max <= 150) filters.priceLevel = 'cheap';
    else if (priceRange.min && priceRange.min >= 500) filters.priceLevel = 'luxury';
    else filters.priceLevel = 'moderate';
  }

  // Rating
  const ratings = extractRatings(query);
  if (ratings?.min) {
    filters.minRating = ratings.min;
  }

  // Features
  const features = extractFeatures(query);
  if (features.length > 0) {
    filters.features = features;
  }

  // Sort by
  if (/en yeni|son açılan/i.test(query)) filters.sortBy = 'newest';
  else if (/en yakın|yakınımda/i.test(query)) filters.sortBy = 'distance';
  else if (/en iyi|en çok/i.test(query)) filters.sortBy = 'popularity';
  else if (/puanı|değerlendirme/i.test(query)) filters.sortBy = 'rating';

  // Open now
  if (/açık|çalışıyor|şu an/i.test(query)) {
    filters.openNow = true;
  }

  return filters;
}

/**
 * Calculate confidence score
 */
function calculateConfidence(query: string, tokens: any, entities: any[]): number {
  let score = 0.5;

  // Boost for recognized entities
  score += Math.min(entities.length * 0.1, 0.3);

  // Boost for tokens
  score += Math.min(tokens.tokens.length * 0.02, 0.2);

  // Boost for known categories/locations
  const categories = extractCategories(query);
  if (categories.length > 0) score += 0.1;

  const locations = extractLocations(query, []);
  if (locations.length > 0) score += 0.1;

  return Math.min(score, 1);
}

/**
 * Generate voice response
 */
export function generateVoiceResponse(result: VoiceSearchResult): string {
  const responses: string[] = [];

  if (result.entities.categories.length > 0) {
    responses.push(`${result.entities.categories[0]} kategorisinde`);
  }

  if (result.entities.locations.length > 0) {
    responses.push(`${result.entities.locations[0]} bölgesinde`);
  }

  if (result.filters.minRating) {
    responses.push(`${result.filters.minRating} puan üzeri`);
  }

  if (responses.length === 0) {
    return `"${result.query}" için arama sonuçları`;
  }

  return responses.join(', ') + ' arama sonuçları gösteriliyor';
}

/**
 * Voice command handlers
 */
export const VOICE_COMMANDS = {
  SEARCH: ['ara', 'bul', 'göster', 'listele'],
  NAVIGATE: ['git', 'yol tarifi', 'adres', 'nasıl giderim'],
  FILTER: ['filtrele', 'sadece', 'yalnızca'],
  SORT: ['sırala', 'düzenle'],
  SAVE: ['kaydet', 'favorilere ekle'],
  SHARE: ['paylaş', 'gönder'],
};

/**
 * Execute voice command
 */
export function executeVoiceCommand(
  command: string,
  context: { currentPage?: string; selectedItem?: any }
): { action: string; params: any } | null {
  const normalized = command.toLowerCase().trim();

  // Search commands
  if (VOICE_COMMANDS.SEARCH.some(c => normalized.includes(c))) {
    const query = normalized.replace(new RegExp(VOICE_COMMANDS.SEARCH.join('|'), 'g'), '').trim();
    return { action: 'search', params: { query } };
  }

  // Navigate commands
  if (VOICE_COMMANDS.NAVIGATE.some(c => normalized.includes(c))) {
    if (context.selectedItem) {
      return { action: 'navigate', params: { item: context.selectedItem } };
    }
    return { action: 'navigate', params: { query: normalized } };
  }

  // Filter commands
  if (VOICE_COMMANDS.FILTER.some(c => normalized.includes(c))) {
    const filters = parseNaturalLanguageQuery(normalized).filters;
    return { action: 'filter', params: { filters } };
  }

  // Save commands
  if (VOICE_COMMANDS.SAVE.some(c => normalized.includes(c))) {
    if (context.selectedItem) {
      return { action: 'save', params: { item: context.selectedItem } };
    }
  }

  // Default to search
  return { action: 'search', params: { query: normalized } };
}

