/**
 * Phase 19: AI Chatbot & Assistant
 * Context-aware conversations, RAG integration, intent recognition
 */

import { logger } from './logging';

// ==================== INTENT RECOGNITION ====================

export interface Intent {
  name: string;
  patterns: string[];
  responses: string[];
  requiredContext?: string[];
}

/**
 * Recognize user intent from message
 */
export class IntentRecognizer {
  private intents = new Map<string, Intent>();

  /**
   * Register intent
   */
  registerIntent(intent: Intent): void {
    this.intents.set(intent.name, intent);
  }

  /**
   * Recognize intent from message
   */
  recognize(message: string): { intent: string; confidence: number } | null {
    const normalized = message.toLowerCase().trim();
    let bestMatch: { intent: string; confidence: number } | null = null;

    for (const [intentName, intent] of this.intents) {
      for (const pattern of intent.patterns) {
        const similarity = this.calculateSimilarity(normalized, pattern.toLowerCase());

        if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.confidence)) {
          bestMatch = { intent: intentName, confidence: similarity };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Simple Levenshtein-based similarity
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const distances: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      distances[i] = [i];
    }

    for (let j = 0; j <= str2.length; j++) {
      distances[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          distances[i][j] = distances[i - 1][j - 1];
        } else {
          distances[i][j] = Math.min(
            distances[i - 1][j - 1] + 1,
            distances[i][j - 1] + 1,
            distances[i - 1][j] + 1
          );
        }
      }
    }

    return distances[str1.length][str2.length];
  }
}

// ==================== CONVERSATION CONTEXT ====================

export interface ConversationMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  messages: ConversationMessage[];
  currentIntent?: string;
  extractedEntities: Map<string, any>;
}

/**
 * Manage conversation context and history
 */
export class ConversationManager {
  private contexts = new Map<string, ConversationContext>();
  private readonly maxMessages = 50; // Keep last 50 messages

  /**
   * Create new conversation
   */
  createConversation(userId: string): ConversationContext {
    const sessionId = `session-${Date.now()}-${Math.random()}`;

    const context: ConversationContext = {
      sessionId,
      userId,
      messages: [],
      extractedEntities: new Map()
    };

    this.contexts.set(sessionId, context);

    return context;
  }

  /**
   * Add message to conversation
   */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): ConversationMessage | null {
    const context = this.contexts.get(sessionId);

    if (!context) return null;

    const message: ConversationMessage = {
      id: `msg-${Date.now()}`,
      userId: context.userId,
      role,
      content,
      timestamp: Date.now()
    };

    context.messages.push(message);

    // Keep only recent messages
    if (context.messages.length > this.maxMessages) {
      context.messages.shift();
    }

    return message;
  }

  /**
   * Get conversation history
   */
  getHistory(sessionId: string): ConversationMessage[] {
    const context = this.contexts.get(sessionId);
    return context ? [...context.messages] : [];
  }

  /**
   * Extract entities from message
   */
  extractEntities(sessionId: string, message: string, entities: Record<string, string[]>): Map<string, any> {
    const extracted = new Map<string, any>();

    for (const [key, patterns] of Object.entries(entities)) {
      for (const pattern of patterns) {
        if (message.includes(pattern)) {
          extracted.set(key, pattern);
        }
      }
    }

    const context = this.contexts.get(sessionId);
    if (context) {
      context.extractedEntities = extracted;
    }

    return extracted;
  }

  /**
   * End conversation
   */
  endConversation(sessionId: string): void {
    this.contexts.delete(sessionId);
  }
}

// ==================== RESPONSE GENERATION ====================

/**
 * Generate contextual responses
 */
export class ResponseGenerator {
  private responseTemplates = new Map<string, string[]>();

  /**
   * Register responses for intent
   */
  registerResponses(intent: string, responses: string[]): void {
    this.responseTemplates.set(intent, responses);
  }

  /**
   * Generate response
   */
  generate(intent: string, context?: ConversationContext): string {
    const responses = this.responseTemplates.get(intent) || ['I understand.'];
    const response = responses[Math.floor(Math.random() * responses.length)];

    // Personalize response
    if (context) {
      return response.replace('{user}', context.userId);
    }

    return response;
  }

  /**
   * Generate fallback response
   */
  generateFallback(): string {
    const fallbacks = [
      'I didn\'t quite understand that. Could you rephrase?',
      'I\'m not sure what you mean. Can you provide more details?',
      'Let me help you find what you need.'
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

// ==================== KNOWLEDGE BASE (RAG) ====================

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  embeddings?: number[];
}

/**
 * Retrieval-Augmented Generation for context-aware responses
 */
export class KnowledgeBase {
  private documents = new Map<string, KnowledgeDocument>();

  /**
   * Index document
   */
  indexDocument(doc: KnowledgeDocument): void {
    this.documents.set(doc.id, doc);
    logger.debug('Document indexed', { id: doc.id, category: doc.category });
  }

  /**
   * Search knowledge base
   */
  search(query: string, limit: number = 5): KnowledgeDocument[] {
    const results: Array<{ doc: KnowledgeDocument; score: number }> = [];
    const queryTokens = query.toLowerCase().split(/\s+/);

    for (const doc of this.documents.values()) {
      const docTokens = `${doc.title} ${doc.content}`.toLowerCase().split(/\s+/);
      const matches = queryTokens.filter(token => docTokens.includes(token));
      const score = matches.length / queryTokens.length;

      if (score > 0.3) {
        results.push({ doc, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.doc);
  }

  /**
   * Get documents by category
   */
  getByCategory(category: string): KnowledgeDocument[] {
    return Array.from(this.documents.values()).filter(doc => doc.category === category);
  }

  /**
   * Remove document
   */
  removeDocument(docId: string): void {
    this.documents.delete(docId);
  }
}

// ==================== EXPORTS ====================

export const intentRecognizer = new IntentRecognizer();
export const conversationManager = new ConversationManager();
export const responseGenerator = new ResponseGenerator();
export const knowledgeBase = new KnowledgeBase();
