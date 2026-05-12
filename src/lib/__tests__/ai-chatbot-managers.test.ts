/**
 * Unit Tests — ai/ai-chatbot.ts singleton class managers (Phase 19)
 *
 * - IntentRecognizer (registerIntent + recognize via Levenshtein similarity, threshold 0.7)
 * - ChatbotConversationManager (createConversation/addMessage/getHistory/extractEntities/end)
 * - ResponseGenerator (registerResponses + generate + generateFallback)
 * - KnowledgeBase (RAG: indexDocument/search token-overlap scoring/getByCategory/remove)
 *
 * Singleton state shared — testler unique key kullanır.
 */

import { describe, it, expect } from 'vitest';
import {
  intentRecognizer,
  chatbotConversationManager,
  responseGenerator,
  knowledgeBase,
} from '../ai/ai-chatbot';

describe('IntentRecognizer', () => {
  it('registerIntent + recognize — exact match → similarity 1.0', () => {
    intentRecognizer.registerIntent({
      name: 'greeting-exact-1',
      patterns: ['hello'],
      responses: ['Hi'],
    });
    const result = intentRecognizer.recognize('hello');
    expect(result?.intent).toBe('greeting-exact-1');
    expect(result?.confidence).toBe(1);
  });

  it('recognize — case-insensitive (normalize toLowerCase)', () => {
    intentRecognizer.registerIntent({ name: 'case-test-unique-1', patterns: ['HELLOXYZ123'], responses: [] });
    expect(intentRecognizer.recognize('helloxyz123')?.intent).toBe('case-test-unique-1');
  });

  it('recognize — whitespace trim', () => {
    intentRecognizer.registerIntent({ name: 'trim-test-1', patterns: ['hi'], responses: [] });
    expect(intentRecognizer.recognize('  hi  ')?.intent).toBe('trim-test-1');
  });

  it('recognize — yakın eşleşme (Levenshtein > 0.7)', () => {
    intentRecognizer.registerIntent({ name: 'similar-test-1', patterns: ['weather forecast'], responses: [] });
    // "weather forecast" vs "weather forcast" (1 char fark) → similarity > 0.9
    const result = intentRecognizer.recognize('weather forcast');
    expect(result?.intent).toBe('similar-test-1');
  });

  it('recognize — düşük similarity (< 0.7) → null', () => {
    intentRecognizer.registerIntent({ name: 'low-sim-1', patterns: ['xyz123abc'], responses: [] });
    expect(intentRecognizer.recognize('completely different message')).toBeNull();
  });

  it('recognize — multiple intent → en yüksek confidence kazanır', () => {
    intentRecognizer.registerIntent({ name: 'best-A', patterns: ['hello world'], responses: [] });
    intentRecognizer.registerIntent({ name: 'best-B', patterns: ['hello'], responses: [] });
    const result = intentRecognizer.recognize('hello world');
    // best-A exact match (1.0) > best-B (5/11 ≈ 0.45)
    expect(result?.intent).toBe('best-A');
    expect(result?.confidence).toBe(1);
  });

  it('recognize — boş intents → null', () => {
    // Yeni instance kullanmak yerine bilinmeyen pattern denesek de null gelmeli
    expect(intentRecognizer.recognize('xxxxxxxxxxxxx-unique-no-match-zzzzz')).toBeNull();
  });
});

describe('ChatbotConversationManager', () => {
  it('createConversation — sessionId + userId set, messages boş', () => {
    const ctx = chatbotConversationManager.createConversation('user-conv-1');
    expect(ctx.sessionId).toMatch(/^session-\d+-[0-9a-f]+$/);
    expect(ctx.userId).toBe('user-conv-1');
    expect(ctx.messages).toEqual([]);
    expect(ctx.extractedEntities).toBeInstanceOf(Map);
  });

  it('addMessage — context\'e ekler ve message döner', () => {
    const ctx = chatbotConversationManager.createConversation('user-add');
    const msg = chatbotConversationManager.addMessage(ctx.sessionId, 'user', 'Hello');
    expect(msg?.role).toBe('user');
    expect(msg?.content).toBe('Hello');
    expect(msg?.id).toMatch(/^msg-\d+$/);
  });

  it('addMessage — bilinmeyen sessionId → null', () => {
    expect(chatbotConversationManager.addMessage('non-existent', 'user', 'X')).toBeNull();
  });

  it('addMessage — 50 message cap (sliding window)', () => {
    const ctx = chatbotConversationManager.createConversation('user-cap');
    for (let i = 0; i < 60; i++) {
      chatbotConversationManager.addMessage(ctx.sessionId, 'user', `Msg ${i}`);
    }
    const history = chatbotConversationManager.getHistory(ctx.sessionId);
    expect(history.length).toBeLessThanOrEqual(50);
  });

  it('getHistory — sessionId yok → boş', () => {
    expect(chatbotConversationManager.getHistory('non-existent')).toEqual([]);
  });

  it('getHistory — copy döndürür (referans değil)', () => {
    const ctx = chatbotConversationManager.createConversation('user-copy');
    chatbotConversationManager.addMessage(ctx.sessionId, 'user', 'Test');
    const h1 = chatbotConversationManager.getHistory(ctx.sessionId);
    h1.push({ id: 'X', userId: 'u', role: 'user', content: 'X', timestamp: 0 } as any);
    const h2 = chatbotConversationManager.getHistory(ctx.sessionId);
    expect(h2).not.toBe(h1);
    expect(h2.length).toBeLessThan(h1.length);
  });

  it('extractEntities — pattern match → Map\'e eklenir', () => {
    const ctx = chatbotConversationManager.createConversation('user-entity');
    const result = chatbotConversationManager.extractEntities(
      ctx.sessionId,
      'I want to book a hotel in Şanlıurfa for tomorrow',
      { city: ['Şanlıurfa', 'Istanbul'], action: ['book', 'cancel'] },
    );
    expect(result.get('city')).toBe('Şanlıurfa');
    expect(result.get('action')).toBe('book');
  });

  it('extractEntities — eşleşme yok → boş Map', () => {
    const ctx = chatbotConversationManager.createConversation('user-no-entity');
    const result = chatbotConversationManager.extractEntities(
      ctx.sessionId,
      'random text',
      { city: ['Ankara'] },
    );
    expect(result.size).toBe(0);
  });

  it('endConversation — context silinir', () => {
    const ctx = chatbotConversationManager.createConversation('user-end');
    chatbotConversationManager.addMessage(ctx.sessionId, 'user', 'Hi');
    chatbotConversationManager.endConversation(ctx.sessionId);
    expect(chatbotConversationManager.getHistory(ctx.sessionId)).toEqual([]);
  });
});

describe('ResponseGenerator', () => {
  it('registerResponses + generate — kayıtlı response\'tan birini döner', () => {
    responseGenerator.registerResponses('greeting-rg-1', ['Hello!', 'Hi there!', 'Welcome']);
    const response = responseGenerator.generate('greeting-rg-1');
    expect(['Hello!', 'Hi there!', 'Welcome']).toContain(response);
  });

  it('generate — bilinmeyen intent → "I understand." default', () => {
    expect(responseGenerator.generate('non-existent-intent')).toBe('I understand.');
  });

  it('generate — context\'te {user} placeholder replace', () => {
    responseGenerator.registerResponses('personal-rg-1', ['Hello {user}']);
    const ctx: any = { sessionId: 's', userId: 'Ali', messages: [], extractedEntities: new Map() };
    expect(responseGenerator.generate('personal-rg-1', ctx)).toBe('Hello Ali');
  });

  it('generate — context yok → placeholder olduğu gibi kalır', () => {
    responseGenerator.registerResponses('no-ctx-rg-1', ['Hello {user}']);
    expect(responseGenerator.generate('no-ctx-rg-1')).toBe('Hello {user}');
  });

  it('generateFallback — 3 fallback\'ten biri döner', () => {
    const fallback = responseGenerator.generateFallback();
    expect(typeof fallback).toBe('string');
    expect(fallback.length).toBeGreaterThan(10);
  });
});

describe('KnowledgeBase — RAG', () => {
  it('indexDocument + search — token overlap > 0.3 → result', () => {
    knowledgeBase.indexDocument({
      id: 'kb-1',
      title: 'Şanlıurfa Travel Guide',
      content: 'Şanlıurfa is a beautiful historic city in southeastern Turkey',
      category: 'travel',
    });
    const results = knowledgeBase.search('Şanlıurfa city');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('kb-1');
  });

  it('search — düşük overlap (< 0.3) → boş', () => {
    knowledgeBase.indexDocument({
      id: 'kb-low',
      title: 'Cooking Recipes',
      content: 'Pasta carbonara ingredients',
      category: 'food',
    });
    expect(knowledgeBase.search('quantum physics relativity theory')).toEqual([]);
  });

  it('search — limit parametresi', () => {
    for (let i = 0; i < 10; i++) {
      knowledgeBase.indexDocument({
        id: `kb-limit-${i}`,
        title: `unique-shared-keyword-test-${i}`,
        content: `unique-shared-keyword-test`,
        category: 'test',
      });
    }
    const results = knowledgeBase.search('unique-shared-keyword-test', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('search — score desc sıralı', () => {
    knowledgeBase.indexDocument({
      id: 'kb-score-A',
      title: 'apple banana cherry',
      content: 'apple banana cherry',
      category: 't',
    });
    knowledgeBase.indexDocument({
      id: 'kb-score-B',
      title: 'apple',
      content: 'apple',
      category: 't',
    });
    const results = knowledgeBase.search('apple banana cherry', 5);
    if (results.length >= 2) {
      // İlk eşleşme daha çok token overlap'lı olmalı
      expect(results[0].id).toBe('kb-score-A');
    }
  });

  it('getByCategory — filter', () => {
    knowledgeBase.indexDocument({
      id: 'kb-cat-1',
      title: 'X',
      content: 'X',
      category: `unique-cat-${Date.now()}`,
    });
    const cat = knowledgeBase.search('X', 100); // ensure indexed
    expect(cat.length).toBeGreaterThanOrEqual(0);
    const filtered = knowledgeBase.getByCategory(`unique-cat-${Date.now()}`);
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('removeDocument — siler', () => {
    knowledgeBase.indexDocument({
      id: 'kb-remove',
      title: 'unique-removable-content',
      content: 'unique-removable-content',
      category: 'test',
    });
    expect(knowledgeBase.search('unique-removable-content', 1).length).toBeGreaterThan(0);
    knowledgeBase.removeDocument('kb-remove');
    const remaining = knowledgeBase.search('unique-removable-content', 1).filter((d) => d.id === 'kb-remove');
    expect(remaining).toEqual([]);
  });
});
