/**
 * AI-Powered Content Moderation
 * Task 127: AI Content Moderation
 */

import { db } from '../db';
// @ts-ignore
import { sql } from 'drizzle-orm';

export interface ModerationResult {
  flagged: boolean;
  categories: {
    hate: number;
    harassment: number;
    spam: number;
    profanity: number;
    inappropriate: number;
  };
  scores: {
    toxicity: number;
    sentiment: number;
  };
  action: 'allow' | 'flag' | 'block';
}

// Turkish profanity list (simplified)
const PROFANITY_LIST = ['küfür1', 'küfür2', 'hakaret'];
const SPAM_PATTERNS = [
  /\b(vip|escort|sex|porno)\b/gi,
  /(http|https):\/\/(bit\.ly|tinyurl|t\.co)/gi,
  /\b(\+90\d{10}|\d{11})\b/g,
];

export async function moderateContent(
  content: string,
  type: 'review' | 'comment' | 'place_description' | 'user_bio'
): Promise<ModerationResult> {
  const normalized = content.toLowerCase();
  const result: ModerationResult = {
    flagged: false,
    categories: { hate: 0, harassment: 0, spam: 0, profanity: 0, inappropriate: 0 },
    scores: { toxicity: 0, sentiment: 0.5 },
    action: 'allow',
  };

  // Check profanity
  for (const word of PROFANITY_LIST) {
    if (normalized.includes(word)) {
      result.categories.profanity += 0.5;
    }
  }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      result.categories.spam += 0.8;
    }
  }

  // Check repetition (spam indicator)
  const words = normalized.split(/\s+/);
  const uniqueWords = new Set(words);
  if (uniqueWords.size / words.length < 0.3) {
    result.categories.spam += 0.3;
  }

  // Calculate overall toxicity
  const categoryValues = Object.values(result.categories);
  result.scores.toxicity = Math.max(...categoryValues);
  result.flagged = result.scores.toxicity > 0.5;
  result.action = result.scores.toxicity > 0.8 ? 'block' : result.scores.toxicity > 0.5 ? 'flag' : 'allow';

  // Log moderation
  await db.execute(sql`
    INSERT INTO content_moderation (id, content_type, content_preview, categories, scores, action, created_at)
    VALUES (${generateId()}, ${type}, ${content.substring(0, 100)}, ${JSON.stringify(result.categories)}, ${JSON.stringify(result.scores)}, ${result.action}, ${new Date()})
  `);

  return result;
}

export async function moderateImage(_imageUrl: string): Promise<{
  safe: boolean;
  adult: number;
  violence: number;
  racy: number;
}> {
  // Placeholder for image moderation API integration
  return { safe: true, adult: 0, violence: 0, racy: 0 };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
