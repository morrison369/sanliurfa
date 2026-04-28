import { describe, it, expect } from 'vitest';
import * as voiceSearch from './index';

describe('Voice Search Module', () => {
  describe('isVoiceSearchSupported', () => {
    it('should detect if voice search is supported', () => {
      const supported = voiceSearch.isVoiceSearchSupported();
      expect(typeof supported).toBe('boolean');
    });
  });

  describe('parseNaturalLanguageQuery', () => {
    it('should parse search intent', () => {
      const result = voiceSearch.parseNaturalLanguageQuery('kebap yeri ara');
      
      expect(result.query).toBe('kebap yeri ara');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should extract location entities', () => {
      const result = voiceSearch.parseNaturalLanguageQuery('haliliyede restoran');
      
      expect(result.entities.locations.length).toBeGreaterThan(0);
    });

    it('should extract category entities', () => {
      const result = voiceSearch.parseNaturalLanguageQuery('kebap yeri bul');
      
      expect(result.entities.categories).toContain('restaurant');
    });

    it('should detect open now filter', () => {
      const result = voiceSearch.parseNaturalLanguageQuery('şu an açık restoranlar');
      
      expect(result.filters.openNow).toBe(true);
    });
  });

  describe('executeVoiceCommand', () => {
    it('should execute search command', () => {
      const result = voiceSearch.executeVoiceCommand('kebap ara', {});
      
      expect(result).not.toBeNull();
      expect(result?.action).toBe('search');
    });
  });

  describe('VOICE_COMMANDS', () => {
    it('should have search commands', () => {
      expect(voiceSearch.VOICE_COMMANDS.SEARCH).toContain('ara');
    });
  });
});
