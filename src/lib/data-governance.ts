/**
 * Phase 30: Data Privacy & Governance
 * Data classification, PII detection, data masking, privacy enforcement
 */

import { logger } from './logging';

let tokenizedValueCounter = 0;

// ==================== TYPES & INTERFACES ====================

export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

export interface DataField {
  name: string;
  sensitivity: DataSensitivity;
  piiType?: string;
}

export interface MaskingConfig {
  fieldName: string;
  strategy: 'full' | 'partial' | 'hash' | 'tokenize';
}

export interface PIIMatch {
  type: string;
  match: string;
  start: number;
  end: number;
}

// ==================== DATA CLASSIFIER ====================

export class DataClassifier {
  private fieldClassifications = new Map<string, DataField>();

  // Common sensitive patterns
  private readonly SENSITIVE_FIELDS = {
    email: 'email',
    password: 'password',
    phone: 'phone',
    ssn: 'ssn',
    creditcard: 'creditcard',
    token: 'token',
    key: 'api_key',
    secret: 'secret'
  };

  /**
   * Classify a field
   */
  classifyField(fieldName: string, value?: any): DataField {
    const lowerName = fieldName.toLowerCase();

    // Check for sensitive patterns
    for (const [pattern, piiType] of Object.entries(this.SENSITIVE_FIELDS)) {
      if (lowerName.includes(pattern)) {
        const field: DataField = { name: fieldName, sensitivity: 'restricted', piiType };
        this.fieldClassifications.set(fieldName, field);
        return field;
      }
    }

    // Default classification
    const sensitivity: DataSensitivity = lowerName.includes('public') ? 'public' : 'internal';
    const field: DataField = { name: fieldName, sensitivity };
    this.fieldClassifications.set(fieldName, field);
    return field;
  }

  /**
   * Classify object fields
   */
  classifyObject(obj: Record<string, any>): Record<string, DataField> {
    const classified: Record<string, DataField> = {};

    for (const fieldName of Object.keys(obj)) {
      classified[fieldName] = this.classifyField(fieldName, obj[fieldName]);
    }

    return classified;
  }

  /**
   * Get highest sensitivity level
   */
  getSensitivityLevel(fields: DataField[]): DataSensitivity {
    const levels: Record<DataSensitivity, number> = {
      public: 0,
      internal: 1,
      confidential: 2,
      restricted: 3
    };

    let maxLevel: DataSensitivity = 'public';
    let maxScore = 0;

    for (const field of fields) {
      const score = levels[field.sensitivity];
      if (score > maxScore) {
        maxScore = score;
        maxLevel = field.sensitivity;
      }
    }

    return maxLevel;
  }
}

// ==================== PII DETECTOR ====================

export class PIIDetector {
  private readonly PII_PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /\+?[0-9]{1,3}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/g,
    tc_id: /[0-9]{11}/g,
    iban: /TR[0-9]{24}/g,
    creditcard: /[0-9]{13,19}/g
  };

  /**
   * Detect PII in text
   */
  detect(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          type,
          match: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return matches.sort((a, b) => a.start - b.start);
  }

  /**
   * Check if text contains PII
   */
  containsPII(text: string): boolean {
    for (const pattern of Object.values(this.PII_PATTERNS)) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Redact PII from text
   */
  redact(text: string): string {
    let result = text;
    const matches = this.detect(text);

    // Replace from end to start to maintain positions
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      result = result.substring(0, match.start) + '[REDACTED]' + result.substring(match.end);
    }

    return result;
  }
}

// ==================== DATA MASKER ====================

export class DataMasker {
  private maskingConfigs = new Map<string, MaskingConfig>();

  /**
   * Register masking config
   */
  registerMaskingConfig(config: MaskingConfig): void {
    this.maskingConfigs.set(config.fieldName, config);
  }

  /**
   * Mask a value
   */
  mask(fieldName: string, value: string): string {
    const config = this.maskingConfigs.get(fieldName);
    if (!config) {
      return value;
    }

    return this.applyMasking(value, config.strategy);
  }

  /**
   * Mask object fields
   */
  maskObject(obj: Record<string, any>, fields: string[]): Record<string, any> {
    const masked = { ...obj };

    for (const field of fields) {
      if (field in masked && typeof masked[field] === 'string') {
        masked[field] = this.mask(field, masked[field]);
      }
    }

    return masked;
  }

  /**
   * Apply masking strategy
   */
  private applyMasking(value: string, strategy: string): string {
    switch (strategy) {
      case 'full':
        return '*'.repeat(Math.min(value.length, 10));
      case 'partial':
        if (value.length <= 4) return '*'.repeat(value.length);
        return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
      case 'hash':
        return '****' + Math.abs(value.length * 31).toString(16).substring(0, 4);
      case 'tokenize':
        tokenizedValueCounter += 1;
        return `TOKEN_${value.length.toString(36).toUpperCase()}${tokenizedValueCounter.toString(36).toUpperCase()}`;
      default:
        return value;
    }
  }
}

// ==================== EXPORTS ====================

export const dataClassifier = new DataClassifier();
export const piiDetector = new PIIDetector();
export const dataMasker = new DataMasker();
