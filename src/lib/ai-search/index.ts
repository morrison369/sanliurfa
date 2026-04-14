/**
 * AI-Powered Search & Auto-complete
 * Task 129: AI Search & Auto-complete
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface SearchSuggestion {
  text: string;
  type: 'place' | 'category' | 'tag' | 'recent' | 'trending';
  score: number;
  data?: any;
}

export interface SearchResult {
  id: string;
  type: 'place' | 'event' | 'blog' | 'user';
  title: string;
  description?: string;
  image?: string;
  score: number;
  highlights: string[];
}

// Turkish character normalization
function normalizeTurkish(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i');
}

/**
 * Get search suggestions with AI ranking
 */
export async function getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
  const normalizedQuery = normalizeTurkish(query);
  const suggestions: SearchSuggestion[] = [];

  // Recent searches
  const recent = await db.execute(sql`
    SELECT query, COUNT(*) as count 
    FROM search_logs 
    WHERE normalized_query LIKE ${normalizedQuery + '%'}
    GROUP BY query
    ORDER BY count DESC
    LIMIT 5
  `);
  
  recent.rows.forEach((row: any) => {
    suggestions.push({
      text: row.query,
      type: 'recent',
      score: parseInt(row.count) * 0.5,
    });
  });

  // Place names
  const places = await db.execute(sql`
    SELECT id, name, category 
    FROM places 
    WHERE normalized_name LIKE ${'%' + normalizedQuery + '%'}
    ORDER BY rating DESC
    LIMIT 5
  `);
  
  places.rows.forEach((row: any) => {
    suggestions.push({
      text: row.name,
      type: 'place',
      score: 1.0,
      data: { id: row.id, category: row.category },
    });
  });

  // Categories
  const categories = ['Restoran', 'Cafe', 'Otel', 'Müze', 'Park', 'Alışveriş'];
  categories.forEach(cat => {
    if (normalizeTurkish(cat).includes(normalizedQuery)) {
      suggestions.push({
        text: cat,
        type: 'category',
        score: 0.8,
      });
    }
  });

  // Sort by score and return unique
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Smart search with AI ranking
 */
export async function smartSearch(query: string, options: {
  lat?: number;
  lng?: number;
  radius?: number;
  filters?: Record<string, any>;
  limit?: number;
} = {}): Promise<SearchResult[]> {
  const normalizedQuery = normalizeTurkish(query);
  const limit = options.limit || 20;

  // Build search query
  let whereClause = sql`(
    normalized_name LIKE ${'%' + normalizedQuery + '%'} OR
    normalized_description LIKE ${'%' + normalizedQuery + '%'} OR
    tags @> ${JSON.stringify([normalizedQuery])}::jsonb
  )`;

  if (options.lat && options.lng && options.radius) {
    whereClause = sql`${whereClause} AND (
      6371 * acos(
        cos(radians(${options.lat})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${options.lng})) +
        sin(radians(${options.lat})) * sin(radians(latitude))
      )
    ) <= ${options.radius}`;
  }

  const results = await db.execute(sql`
    SELECT *,
      ts_rank(
        to_tsvector('turkish', COALESCE(name, '') || ' ' || COALESCE(description, '')),
        plainto_tsquery('turkish', ${query})
      ) as search_rank
    FROM places
    WHERE ${whereClause}
    ORDER BY search_rank DESC, rating DESC
    LIMIT ${limit}
  `);

  return results.rows.map((row: any) => ({
    id: row.id,
    type: 'place',
    title: row.name,
    description: row.description?.substring(0, 100),
    image: row.main_image,
    score: parseFloat(row.search_rank),
    highlights: extractHighlights(row.description, query),
  }));
}

/**
 * Extract highlighted snippets
 */
function extractHighlights(text: string, query: string): string[] {
  if (!text) return [];
  
  const sentences = text.split(/[.!?]+/);
  const highlights: string[] = [];
  
  for (const sentence of sentences) {
    if (normalizeTurkish(sentence).includes(normalizeTurkish(query))) {
      highlights.push(sentence.trim());
      if (highlights.length >= 2) break;
    }
  }
  
  return highlights;
}

/**
 * Log search for analytics
 */
export async function logSearch(query: string, userId?: string, results?: number): Promise<void> {
  await db.execute(sql`
    INSERT INTO search_logs (id, query, normalized_query, user_id, result_count, created_at)
    VALUES (${generateId()}, ${query}, ${normalizeTurkish(query)}, ${userId || null}, ${results || 0}, ${new Date()})
  `);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
